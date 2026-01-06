require("dotenv").config(); // ✅ FIRST

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const admin = require("firebase-admin");

const app = express();

// ✅ Initialize Firebase Admin
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// ✅ Middleware
app.use(cors());

// ⚠️ IMPORTANT: Webhook route BEFORE express.json()
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('⚠️  Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful payment
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    console.log('✅ Payment successful:', session.id);
    
    const userId = session.metadata.userId;
    const orderId = session.id;
    const items = JSON.parse(session.metadata.items || '[]');

    try {
      // Save order to Firebase
      await db.collection('orders').doc(orderId).set({
        userId: userId,
        orderId: orderId,
        amount: session.amount_total / 100,
        currency: session.currency,
        status: 'paid',
        paymentIntent: session.payment_intent,
        customerEmail: session.customer_details?.email,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        items: items,
      });

      console.log('✅ Order saved to Firestore:', orderId);

      // Clear user's cart
      await db.collection('carts').doc(userId).set({
        items: [],
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log('✅ Cart cleared for user:', userId);
    } catch (error) {
      console.error('❌ Error saving order:', error);
    }
  }

  res.json({ received: true });
});

// Now apply JSON middleware for other routes
app.use(express.json());

// ✅ Existing Routes
const productRoutes = require("./routes/productRoutes");
app.use("/api/products", productRoutes);

// ✅ NEW: Stripe Routes
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { items, userId } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items in cart' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.title,
            images: item.images && item.images[0] ? [item.images[0]] : [],
            description: item.brand || '',
          },
          unit_amount: Math.round(item.price * 100), // Convert to cents
        },
        quantity: item.quantity || 1,
      })),
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cart`,
      metadata: {
        userId: userId,
        items: JSON.stringify(items.map(item => ({
          id: item.id,
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          images: item.images,
        }))),
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify session after payment
app.get('/api/verify-session/:sessionId', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    res.json({
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email,
    });
  } catch (error) {
    console.error('❌ Error verifying session:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;

// ✅ Connect DB, then start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");

    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => console.log("❌ MongoDB connection error:", err));