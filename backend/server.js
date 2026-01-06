require("dotenv").config(); // ✅ FIRST

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const admin = require("firebase-admin");

const app = express();

// ✅ Initialize Firebase Admin
let db;
if (process.env.FIREBASE_ADMIN_KEY) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
  } catch (err) {
    console.error('Invalid FIREBASE_ADMIN_KEY JSON. Set FIREBASE_ADMIN_KEY to the JSON string of your service account.');
    console.error(err);
    process.exit(1);
  }
} else {
  try {
    const serviceAccount = require("./serviceAccountKey.json");
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
  } catch (err) {
    console.error('Missing Firebase admin credentials. Provide FIREBASE_ADMIN_KEY env or place serviceAccountKey.json in backend folder.');
    console.error(err);
    process.exit(1);
  }
}

// ✅ Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://firestore.googleapis.com", "https://api.cloudinary.com"],
    },
  },
}));
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

// Product CRUD for admin
const Product = require('./models/Product');

app.post('/api/products', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// Create or retrieve a Stripe customer and store mapping in Firestore
app.post('/api/create-customer', async (req, res) => {
  try {
    const { email, name, uid } = req.body;

    if (!email || !uid) return res.status(400).json({ error: 'Missing email or uid' });

    // Try to find existing Stripe customer by metadata or email
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customer = customers.data[0];

    if (!customer) {
      customer = await stripe.customers.create({
        email,
        name,
        metadata: { firebaseUid: uid }
      });
    }

    // Save mapping to Firestore users collection
    await db.collection('users').doc(uid).set({
      email,
      name,
      uid,
      stripeCustomerId: customer.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    res.json({ stripeCustomerId: customer.id });
  } catch (err) {
    console.error('Error creating customer:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Firestore user by uid
app.get('/api/users/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
    const docRef = db.collection('users').doc(uid);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).json({ error: 'User not found' });
    res.json(docSnap.data());
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get orders for a user from Firestore
app.get('/api/orders/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
    const ordersRef = db.collection('orders').where('userId', '==', uid).orderBy('createdAt', 'desc');
    const snap = await ordersRef.get();
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: err.message });
  }
});
// Update order status
app.put('/api/orders/:id', async (req, res) => {
  try {
    const { orderStatus } = req.body;
    await db.collection('orders').doc(req.params.id).update({ orderStatus });
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Update user profile in Firestore
app.put('/api/users/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
    const { name, lastname, email } = req.body;
    await db.collection('users').doc(uid).update({
      name,
      lastname,
      email,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: err.message });
  }
});

// Refund an order
app.post('/api/refund/:orderId', async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) return res.status(404).json({ error: 'Order not found' });
    const order = orderDoc.data();
    if (!order.paymentIntentId) return res.status(400).json({ error: 'No payment intent for this order' });

    const refund = await stripe.refunds.create({
      payment_intent: order.paymentIntentId,
    });

    // Update order status
    await db.collection('orders').doc(orderId).update({
      orderStatus: 'Refunded',
      refundId: refund.id,
    });

    res.json({ refund });
  } catch (err) {
    console.error('Error processing refund:', err);
    res.status(500).json({ error: err.message });
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