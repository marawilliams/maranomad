const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const Order = require('../models/Order');
const formData = require('form-data');
const Mailgun = require('mailgun.js');

// Initialize Mailgun
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY
});

const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;

// GET all orders (admin only)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .lean();
    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET single order
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// UPDATE order status
router.put('/:id/status', async (req, res) => {
  const { status } = req.body;
  
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// In your orderRoutes.js, update the ship endpoint:

router.post('/:id/ship', async (req, res) => {
  const { trackingNumber, carrier, trackingUrl } = req.body;
  
  console.log('📦 Ship order request:', { orderId: req.params.id, trackingNumber, carrier });
  
  if (!trackingNumber || !carrier) {
    return res.status(400).json({ error: 'Tracking number and carrier are required' });
  }
  
  // Check Mailgun config
  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
    console.error('❌ Mailgun not configured! Missing API key or domain');
    return res.status(500).json({ error: 'Email service not configured' });
  }
  
  try {
    // Update order
    let order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status: 'shipped',
        trackingNumber,
        carrier,
        trackingUrl: trackingUrl || `https://www.google.com/search?q=${carrier}+tracking+${trackingNumber}`,
        shippedAt: new Date()
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // ✅ FIX: Fetch the order again with all fields
    order = await Order.findById(req.params.id);
    
    console.log('✅ Order updated:', order._id);
    console.log('Products:', order.products); // Debug log

    // Check if products array exists
    if (!order.products || order.products.length === 0) {
      console.error('❌ Order has no products!');
      return res.status(400).json({ error: 'Order has no products' });
    }

    // Get customer email
    let customerEmail;
    try {
      const User = require('../models/User');
      const user = await User.findOne({ uid: order.userId });
      customerEmail = user?.email;
      
      if (!customerEmail) {
        console.error('❌ No email found for user:', order.userId);
        return res.status(400).json({ error: 'Customer email not found' });
      }
      
      console.log('📧 Sending email to:', customerEmail);
    } catch (err) {
      console.error('❌ Error finding user:', err);
      return res.status(500).json({ error: 'Could not find customer email' });
    }

    // Generate tracking URL
    const finalTrackingUrl = trackingUrl || getCarrierTrackingUrl(carrier, trackingNumber);

    // Send tracking email via Mailgun
    try {
      console.log('Full order object:', JSON.stringify(order, null, 2));

      const emailData = {
        from: `Your Store <noreply@${MAILGUN_DOMAIN}>`,
        to: [customerEmail],
        subject: `Your order has shipped! 📦 - Order #${order._id.toString().slice(-8)}`,
        html: generateTrackingEmailHTML(order, carrier, trackingNumber, finalTrackingUrl)
      };
      
      console.log('📤 Sending email via Mailgun...', { to: customerEmail, domain: MAILGUN_DOMAIN });
      
      const result = await mg.messages.create(MAILGUN_DOMAIN, emailData);
      
      console.log('✅ Email sent successfully!', result);
      console.log('Message ID:', result.id);
      
    } catch (emailError) {
      console.error('❌ Mailgun error:', emailError);
      console.error('Error details:', emailError.message);
      
      return res.status(500).json({ 
        error: 'Failed to send tracking email',
        details: emailError.message 
      });
    }

    res.json({ 
      message: 'Order marked as shipped and tracking email sent',
      order,
      emailSent: true
    });
  } catch (err) {
    console.error('❌ Error shipping order:', err);
    res.status(500).json({ error: 'Failed to update order', details: err.message });
  }
});

// Helper function to generate carrier tracking URLs
function getCarrierTrackingUrl(carrier, trackingNumber) {
  const urls = {
    'USPS': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
    'UPS': `https://www.ups.com/track?trackingNumber=${trackingNumber}`,
    'FedEx': `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
    'DHL': `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
  };
  
  return urls[carrier] || `https://www.google.com/search?q=${carrier}+tracking+${trackingNumber}`;
}
// Replace your generateTrackingEmailHTML function with this:
function generateTrackingEmailHTML(order, carrier, trackingNumber, trackingUrl) {
  // Safety check for products
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
            <p style="margin: 5px 0;"><strong>Order Number:</strong> #${order._id.toString().slice(-8)}</p>
            <p style="margin: 5px 0;"><strong>Carrier:</strong> ${carrier}</p>
            <p style="margin: 5px 0;"><strong>Tracking Number:</strong> ${trackingNumber}</p>
          </div>

          <div style="text-align: center;">
            <a href="${trackingUrl}" class="button">
              Track Your Package
            </a>
          </div>

          ${products.length > 0 ? `
            <div class="items">
              <h3 style="margin-top: 0;">Items Shipped</h3>
              ${products.map(item => `
                <div class="item">
                  <strong>${item.title || 'Product'}</strong>
                  ${item.size ? `<span style="color: #666;"> - Size: ${item.size}</span>` : ''}
                  <br>
                  <span style="color: #666;">Quantity: ${item.quantity || 1} × $${(item.price || 0).toFixed(2)}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div style="background: white; padding: 15px; border-radius: 5px;">
            <h3 style="margin-top: 0;">Shipping Address</h3>
            <p style="margin: 5px 0;">
              ${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}<br>
              ${order.shippingAddress?.address || ''}<br>
              ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.region || ''} ${order.shippingAddress?.postalCode || ''}
              ${order.shippingAddress?.phone ? `<br>Phone: ${order.shippingAddress.phone}` : ''}
            </p>
          </div>

          <p style="margin-top: 30px;">If you have any questions about your order, please don't hesitate to contact us.</p>
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
// GET all orders for a user by UID
router.get("/:uid", async (req, res) => {
  const { uid } = req.params;

  try {
    const ordersRef = admin.firestore().collection("orders");
    const snapshot = await ordersRef.where("userId", "==", uid).get();

    if (snapshot.empty) {
      return res.json([]);
    }

    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(orders);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

module.exports = router;
