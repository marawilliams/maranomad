require("dotenv").config(); // ✅ Must be first

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const admin = require("firebase-admin");
const Product = require("./models/Product"); // Mongo product model

const app = express();

// 🔹 Debug keys
console.log('🔑 Stripe Key Type:', process.env.STRIPE_SECRET_KEY?.substring(0, 8));
console.log('🔑 Full key exists:', !!process.env.STRIPE_SECRET_KEY);

// 🔹 Initialize Firebase
let db;
try {
  if (process.env.FIREBASE_ADMIN_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    const serviceAccount = require("./serviceAccountKey.json");
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  db = admin.firestore();
} catch (err) {
  console.error("❌ Firebase initialization failed:", err);
  process.exit(1);
}
//works!

// ⚠️ Webhook must be BEFORE express.json()
app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("⚠️ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log("🔥 Stripe webhook received:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log("✅ Payment successful:", session.id);


    try {//DIFFERENT
      const paymentIntent = session.payment_intent
        ? await stripe.paymentIntents.retrieve(session.payment_intent)
        : null;

      if (!paymentIntent) {
        console.error("❌ No PaymentIntent found for session:", session.id);
        return res.status(400).send("No PaymentIntent found");
      }

      const userId = session.metadata.userId;
      const orderId = session.id;
      const items = JSON.parse(session.metadata.items || "[]");
      const productIdsRaw = JSON.parse(session.metadata.productIds || "[]");
      const productIds = productIdsRaw
  .filter(Boolean)
  .map(id => new mongoose.Types.ObjectId(id));
  console.log('📦 productIdsRaw:', productIdsRaw);
console.log('📦 converted ObjectIds:', productIds);


      // 1️⃣ Mark products as sold in MongoDB
      if (productIds.length > 0) {
        const result = await Product.updateMany(
          { _id: { $in: productIds }, status: { $ne: "sold" } },
          { $set: { status: "sold" } }
        );
        console.log(`✅ Products updated: ${result.modifiedCount}/${productIds.length}`);
      }

      // 2️⃣ Save order to Firestore with paymentIntentId
      await db.collection("orders").doc(orderId).set({
        userId,
        orderId,
        amount: session.amount_total / 100, //session vs paymentIntent?
        currency: session.currency,
        status: "paid",
        paymentIntentId: paymentIntent.id, // ✅ key for refunds
        customerEmail: session.customer_details?.email || null,
        shippingAddress: session.shipping_details?.address || null,
        shippingName: session.shipping_details?.name || null,
        billingAddress: session.customer_details?.address || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        items,
      });
      console.log("✅ Order saved to Firestore:", orderId);

      // 3️⃣ Clear user cart
      await db.collection("carts").doc(userId).set({
        items: [],
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log("✅ Cart cleared for user:", userId);
    } catch (err) {
      console.error("❌ Error processing checkout.session.completed webhook:", err);
    }
  }

  res.json({ received: true });
});

// 🔹 Global middleware AFTER webhook
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: [
        "'self'",
        "https://api.stripe.com",
        "https://firestore.googleapis.com",
        "https://api.cloudinary.com",
      ],
    },
  },
}));
app.use(cors());
app.use(express.json());

//this is not in the new file
// 🔹 Routes (Products, Checkout, Users, Orders, Refunds, etc.)
const productRoutes = require("./routes/productRoutes");
app.use("/api/products", productRoutes);

// Admin Product CRUD
app.post("/api/products", async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
//up to here

// 🔹 Stripe Checkout Session
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const { items, userId } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: "No items in cart" });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: items.map(item => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.title,
            images: item.images?.[0] ? [item.images[0]] : [],
            description: item.brand || "",
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity || 1,
      })),
      mode: "payment",
      billing_address_collection: "required",
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "AU", "DE", "FR", "IT", "ES", "NL"],
      },
      success_url: `${process.env.CLIENT_URL}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cart`,
      metadata: {
        userId,
        items: JSON.stringify(items),
        productIds: JSON.stringify(items.map(i => i._id || i.id).filter(Boolean)), // ✅ Save product IDs for webhook
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("❌ Error creating checkout session:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Refund route using paymentIntentId
app.post("/api/refund/:orderId", async (req, res) => {
  try {
    const orderDoc = await db.collection("orders").doc(req.params.orderId).get();
    if (!orderDoc.exists) return res.status(404).json({ error: "Order not found" });

    const order = orderDoc.data();
    if (!order.paymentIntentId) return res.status(400).json({ error: "No payment intent for this order" });

    const refund = await stripe.refunds.create({ payment_intent: order.paymentIntentId });

    await db.collection("orders").doc(req.params.orderId).update({
      status: "Refunded",
      refundId: refund.id,
    });

    res.json({ refund });
  } catch (err) {
    console.error("❌ Refund error:", err);
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/verify-session/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  console.log("🔹 verify-session called with:", sessionId);

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log("🔹 Stripe returned session:", session);

    res.json({
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email || null,
      items: session.metadata?.items ? JSON.parse(session.metadata.items) : [],
    });
  } catch (err) {
    console.error("❌ Error verifying session:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
  })
  .catch(err => console.error("❌ MongoDB connection error:", err));
