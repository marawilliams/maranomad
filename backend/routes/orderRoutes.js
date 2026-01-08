const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const formData = require("form-data");
const Mailgun = require("mailgun.js");

// Initialize Mailgun
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY,
});

const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;

// ====================
// GET all orders (admin)
// ====================
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).lean();
    res.json(orders);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// ====================
// GET single order by ID
// ====================
router.get("/:id", async (req, res) => {
  try {
    const orderId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(order);
  } catch (err) {
    console.error("Failed to fetch order:", err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// ====================
// UPDATE order status
// ====================
router.put("/:id/status", async (req, res) => {
  const { status } = req.body;

  try {
    const orderId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(order);
  } catch (err) {
    console.error("Failed to update order status:", err);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// ====================
// MARK ORDER AS SHIPPED
// ====================
router.post("/:id/ship", async (req, res) => {
  const { trackingNumber, carrier, trackingUrl } = req.body;

  console.log("📦 Ship order request:", {
    orderId: req.params.id,
    trackingNumber,
    carrier,
  });

  if (!trackingNumber || !carrier) {
    return res.status(400).json({
      error: "Tracking number and carrier are required",
    });
  }

  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
    console.error("❌ Mailgun not configured");
    return res.status(500).json({ error: "Email service not configured" });
  }

  try {
    const orderId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    // Update order with shipped status
    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        status: "shipped",
        trackingNumber,
        carrier,
        trackingUrl:
          trackingUrl ||
          `https://www.google.com/search?q=${carrier}+tracking+${trackingNumber}`,
        shippedAt: new Date(),
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    console.log("✅ Order updated:", order._id);

    // Validate products
    if (!order.products || order.products.length === 0) {
      console.error("❌ Order has no products:", order._id);
      return res.status(400).json({ error: "Order has no products" });
    }

    // Get email from order (guest-safe)
    const customerEmail = order.customerEmail;
    console.log("📧 Customer email from order:", customerEmail);

    if (!customerEmail) {
      console.error("❌ Order missing customer email:", order._id);
      return res.status(400).json({
        error: "Order has no customer email",
        orderId: order._id,
      });
    }

    // Generate tracking URL
    const finalTrackingUrl =
      trackingUrl || getCarrierTrackingUrl(carrier, trackingNumber);

    // Send tracking email via Mailgun
    try {
      const emailData = {
        from: `Your Store <noreply@${MAILGUN_DOMAIN}>`,
        to: [customerEmail],
        subject: `Your order has shipped! 📦 - Order #${order._id
          .toString()
          .slice(-8)}`,
        html: generateTrackingEmailHTML(
          order,
          carrier,
          trackingNumber,
          finalTrackingUrl
        ),
      };

      console.log("📤 Sending tracking email...", {
        to: customerEmail,
        orderId: order._id,
      });

      const result = await mg.messages.create(MAILGUN_DOMAIN, emailData);
      console.log("✅ Email sent:", result.id);
    } catch (emailError) {
      console.error("❌ Failed to send email:", emailError.message);
      return res.status(500).json({
        error: "Failed to send tracking email",
        details: emailError.message,
      });
    }

    res.json({
      message: "Order marked as shipped and tracking email sent",
      order,
      emailSent: true,
    });
  } catch (err) {
    console.error("❌ Error shipping order:", err);
    return res.status(500).json({
      error: "Failed to update order",
      details: err.message,
    });
  }
});

// ====================
// HELPER: Generate carrier tracking URL
// ====================
function getCarrierTrackingUrl(carrier, trackingNumber) {
  const urls = {
    USPS: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
    UPS: `https://www.ups.com/track?trackingNumber=${trackingNumber}`,
    FedEx: `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
    DHL: `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
  };
  return urls[carrier] || `https://www.google.com/search?q=${carrier}+tracking+${trackingNumber}`;
}

// ====================
// HELPER: Generate tracking email HTML
// ====================
function generateTrackingEmailHTML(order, carrier, trackingNumber, trackingUrl) {
  const products = order.products || [];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #635BFF; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .tracking-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #635BFF; }
        .button { display: inline-block; background: #635BFF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .items { background: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .item { padding: 10px 0; border-bottom: 1px solid #eee; }
        .item:last-child { border-bottom: none; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Your Order Has Shipped! 🎉</h1>
        </div>
        <div class="content">
          <p>Great news! Your order is on its way to you.</p>
          <div class="tracking-box">
            <h3 style="margin-top: 0;">Tracking Information</h3>
            <p><strong>Order Number:</strong> #${order._id.toString().slice(-8)}</p>
            <p><strong>Carrier:</strong> ${carrier}</p>
            <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
          </div>
          <div style="text-align: center;">
            <a href="${trackingUrl}" class="button">Track Your Package</a>
          </div>
          ${
            products.length > 0
              ? `<div class="items">
                  <h3 style="margin-top: 0;">Items Shipped</h3>
                  ${products
                    .map(
                      (item) => `<div class="item">
                        <strong>${item.title || "Product"}</strong>
                        ${item.size ? `<span> - Size: ${item.size}</span>` : ""}
                        <br>
                        <span>Quantity: ${item.quantity || 1} × $${(
                        item.price || 0
                      ).toFixed(2)}</span>
                      </div>`
                    )
                    .join("")}
                </div>`
              : ""
          }
          <div style="background: white; padding: 15px; border-radius: 5px;">
            <h3 style="margin-top: 0;">Shipping Address</h3>
            <p>
              ${order.shippingAddress?.firstName || ""} ${
    order.shippingAddress?.lastName || ""
  }<br>
              ${order.shippingAddress?.address || ""}<br>
              ${order.shippingAddress?.city || ""}, ${
    order.shippingAddress?.region || ""
  } ${order.shippingAddress?.postalCode || ""}${
    order.shippingAddress?.phone ? `<br>Phone: ${order.shippingAddress.phone}` : ""
  }
            </p>
          </div>
          <p style="margin-top: 30px;">If you have any questions about your order, please contact us.</p>
        </div>
        <div class="footer">
          <p>Thank you for your purchase!</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = router;
