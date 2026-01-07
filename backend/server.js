require("dotenv").config(); // ✅ FIRST

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const admin = require("firebase-admin");

const app = express();

// Add these debug lines:
console.log('🔑 Stripe Key Type:', process.env.STRIPE_SECRET_KEY?.substring(0, 8));
console.log('🔑 Full key exists:', !!process.env.STRIPE_SECRET_KEY);

// ✅ Initialize Firebase Admin
if (process.env.FIREBASE_ADMIN_KEY) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
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
// ⚠️ Stripe Webhook - safe and robust
app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
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

    try {
      switch (event.type) {

        // 1️⃣ Checkout session completed: create order
        case "checkout.session.completed": {
          const session = event.data.object;

          console.log("✅ Checkout completed:", session.id);

          // ✅ DEFINE VARIABLES FIRST - moved from below
          const userId = session.metadata.userId;
          const items = JSON.parse(session.metadata.items || "[]");
          const productIds = JSON.parse(session.metadata.productIds || "[]")
            .filter(Boolean)
            .map((id) => new mongoose.Types.ObjectId(id));

          console.log(`📦 Processing order for user: ${userId}`);
          console.log(`📦 Products: ${productIds.length} items`);

          // ✅ Mark products as sold (with proper checks)
          if (productIds.length > 0) {
            const result = await Product.updateMany(
              { 
                _id: { $in: productIds },
                reservedBy: userId, // Only update if reserved by this user
                status: 'reserved' // Only update if currently reserved
              },
              { 
                $set: { 
                  status: 'sold',
                  soldAt: new Date(),
                  soldTo: userId,
                  // Clear reservation fields
                  reservedBy: null,
                  reservedAt: null,
                  reservedUntil: null, // ✅ Fixed: was reservationExpiresAt
                } 
              }
            );
            
            console.log(`✅ Marked ${result.modifiedCount}/${productIds.length} products as sold`);
            
            if (result.modifiedCount < productIds.length) {
              console.warn(`⚠️ Warning: Only ${result.modifiedCount} out of ${productIds.length} products were marked as sold`);
              console.warn(`   This might mean some products were not reserved by user ${userId}`);
            }
          }

          // ✅ Shipping info
          const shippingName =
            session.shipping_details?.name || session.customer_details?.name || "";
          const [firstName, ...rest] = shippingName.split(" ");
          const shippingAddress = {
            firstName,
            lastName: rest.join(" "),
            address:
              session.shipping_details?.address?.line1 ||
              session.customer_details?.address?.line1 ||
              "",
            apartment:
              session.shipping_details?.address?.line2 ||
              session.customer_details?.address?.line2 ||
              "",
            city:
              session.shipping_details?.address?.city ||
              session.customer_details?.address?.city ||
              "",
            region:
              session.shipping_details?.address?.state ||
              session.customer_details?.address?.state ||
              "",
            postalCode:
              session.shipping_details?.address?.postal_code ||
              session.customer_details?.address?.postal_code ||
              "",
            country:
              session.shipping_details?.address?.country ||
              session.customer_details?.address?.country ||
              "",
            phone: session.customer_details?.phone || session.shipping_details?.phone || "",
          };

          console.log(`📍 Shipping to: ${shippingAddress.city}, ${shippingAddress.region}`);

          // ✅ Try retrieving PaymentIntent for card info (optional)
          let paymentMethod = null;
          if (session.payment_intent) {
            try {
              const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
              const charge = paymentIntent.charges?.data?.[0];
              if (charge?.payment_method_details?.card) {
                const card = charge.payment_method_details.card;
                paymentMethod = {
                  brand: card.brand,
                  last4: card.last4,
                  expMonth: card.exp_month,
                  expYear: card.exp_year,
                };
                console.log(`💳 Payment method: ${card.brand} •••• ${card.last4}`);
              }
            } catch (err) {
              console.warn("⚠️ Could not retrieve payment method details:", err.message);
            }
          }

          // ✅ Save order in MongoDB
          const order = new Order({
            userId,
            products: items.map((item, i) => ({
              productId: productIds[i],
              title: item.title,
              quantity: item.quantity,
              price: item.price,
              size: item.size || "",
            })),
            subtotal: session.amount_total / 100,
            status: "paid",
            shippingAddress,
            paymentIntentId: session.payment_intent,
            paymentMethod, // last4 stored if available
          });

          await order.save();
          console.log("✅ Order created in MongoDB:", order._id);
          console.log(`💰 Order total: $${order.subtotal}`);
          
          break;
        }

        // 2️⃣ PaymentIntent succeeded: attach last4 if missing
        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object;

          const charge = paymentIntent.charges?.data?.[0];
          if (!charge?.payment_method_details?.card) {
            console.log("ℹ️ No card details available for PaymentIntent:", paymentIntent.id);
            break;
          }

          const card = charge.payment_method_details.card;
          const paymentMethod = {
            brand: card.brand,
            last4: card.last4,
            expMonth: card.exp_month,
            expYear: card.exp_year,
          };

          // Update order if it exists and doesn't have payment method yet
          const order = await Order.findOne({ 
            paymentIntentId: paymentIntent.id,
            paymentMethod: null // Only update if payment method is missing
          });
          
          if (order) {
            order.paymentMethod = paymentMethod;
            await order.save();
            console.log(`💳 Card info updated for order ${order._id}: ${card.brand} •••• ${card.last4}`);
          } else {
            console.log("ℹ️ No matching order found (or payment method already set) for PaymentIntent:", paymentIntent.id);
          }

          break;
        }

        // Ignore other events safely
        default:
          console.log("ℹ️ Unhandled event type:", event.type);
      }

      res.json({ received: true });
    } catch (err) {
      console.error("❌ Webhook processing error:", err);
      console.error("Stack trace:", err.stack);
      res.status(500).send("Webhook handler failed");
    }
  }
);

// Now apply JSON middleware for other routes
app.use(express.json());

// ✅ Import Models
const Product = require('./models/Product');
const User = require('./models/User');
const Order = require('./models/Order');




// Product CRUD for admin
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

// ✅ Stripe Routes
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { items, userId } = req.body;

    console.log('📦 Checkout request received');
    console.log('👤 User ID:', userId);
    console.log('🛒 Items:', items);

    if (!items || items.length === 0) {
      console.error('❌ No items in cart');
      return res.status(400).json({ error: 'No items in cart' });
    }

    // Extract product IDs for webhook
    const productIds = items.map(item => item.id || item._id);
    console.log('🔑 Product IDs:', productIds);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map(item => {
        console.log('📝 Processing item:', item.title, 'Price:', item.price);
        return {
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
        };
      }),
      mode: 'payment',
      
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'MX', 'JP'],
      },
      
      success_url: `${process.env.CLIENT_URL}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cart`,
      metadata: {
        userId: userId,
        // ✅ REMOVE IMAGES from metadata - only store essential data
        items: JSON.stringify(items.map(item => ({
          id: item.id || item._id,
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          size: item.size,
          // images: item.images, // ❌ REMOVE THIS - causes metadata to exceed 500 chars
        }))),
        productIds: JSON.stringify(productIds),
      },
    });

    console.log('✅ Checkout session created:', session.id);
    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('❌ Error creating checkout session:');
    console.error('Error message:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Create or retrieve a Stripe customer and store mapping in MongoDB
app.post('/api/create-customer', async (req, res) => {
  try {
    const { email, name, uid } = req.body;

    if (!email || !uid) return res.status(400).json({ error: 'Missing email or uid' });

    // Try to find existing Stripe customer by email
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customer = customers.data[0];

    if (!customer) {
      customer = await stripe.customers.create({
        email,
        name,
        metadata: { firebaseUid: uid }
      });
    }

    // Save/update user in MongoDB with Stripe customer ID
    let user = await User.findOne({ uid });
    
    if (!user) {
      user = new User({
        uid,
        email,
        name,
        stripeCustomerId: customer.id,
      });
    } else {
      user.stripeCustomerId = customer.id;
    }
    
    await user.save();

    res.json({ stripeCustomerId: customer.id });
  } catch (err) {
    console.error('Error creating customer:', err);
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/products/availability', async (req, res) => {
  try {
    const { ids, uid } = req.query;

    if (!ids) {
      return res.status(400).json({ error: 'No product IDs provided' });
    }

    // Convert ids to array
    const idArray = Array.isArray(ids)
      ? ids
      : ids.split(',').map(id => id.trim());

    // Validate MongoDB ObjectIds
    const validIds = idArray.filter(id =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (validIds.length === 0) {
      return res.status(400).json({ error: 'No valid product IDs provided' });
    }

    const products = await Product.find(
      { _id: { $in: validIds } },
      { status: 1 } // only fetch what we need
    );

    const availability = {};

    products.forEach(product => {
      availability[product._id.toString()] =
        product.status === 'for-sale'; // adjust if needed
    });

    return res.json({
      uid, // optional, but returned since frontend sends it
      availability,
    });

  } catch (err) {
    console.error('Error checking availability:', err);
    res.status(500).json({ error: 'Failed to check product availability' });
  }
});

// Get orders for a user from MongoDB
// Get orders for a user from MongoDB
app.get('/api/orders/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
    const orders = await Order.find({ userId: uid })
      .sort({ createdAt: -1 })
      .lean();

    // Transform data to match frontend expectations
    const transformedOrders = orders.map(order => ({
      id: order._id.toString(),
      orderDate: order.createdAt,
      subtotal: order.subtotal,
      orderStatus: order.status,
      products: order.products,
      paymentIntentId: order.paymentIntentId,
      // ✅ Map shippingAddress to data for frontend compatibility
      data: {
        firstName: order.shippingAddress?.firstName || '',
        lastName: order.shippingAddress?.lastName || '',
        address: order.shippingAddress?.address || '',
        apartment: order.shippingAddress?.apartment || '',
        city: order.shippingAddress?.city || '',
        region: order.shippingAddress?.region || '',
        postalCode: order.shippingAddress?.postalCode || '',
        country: order.shippingAddress?.country || '',
        phone: order.shippingAddress?.phone || '',
      }
    }));

    res.json(transformedOrders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update order status
app.put('/api/orders/:id', async (req, res) => {
  try {
    const { orderStatus } = req.body;
    await Order.findByIdAndUpdate(req.params.id, { status: orderStatus });
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Refund an order
app.post('/api/refund/:orderId', async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId);
    
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!order.paymentIntentId) return res.status(400).json({ error: 'No payment intent for this order' });

    const refund = await stripe.refunds.create({
      payment_intent: order.paymentIntentId,
    });

    // Update order status
    await Order.findByIdAndUpdate(orderId, {
      status: 'Refunded',
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


const RESERVATION_TIME = 60 * 60 * 1000; // 1 hour in ms

// Find this endpoint in server.js and update it:
app.post('/api/reserve-products', async (req, res) => {
  try {
    const { productIds, userId } = req.body;
    if (!productIds || !userId) {
      return res.status(400).json({ error: 'Missing productIds or userId' });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + RESERVATION_TIME);

    console.log(`🔒 Attempting to reserve ${productIds.length} products for user ${userId}`);

    const reservedProducts = [];
    const unavailableProducts = [];

    for (const id of productIds) {
      const product = await Product.findOneAndUpdate(
        {
          _id: id,
          $or: [
            { status: 'for-sale' }, // ✅ Changed from 'available'
            { status: 'reserved', reservedUntil: { $lt: now } } // Expired reservation
          ]
        },
        {
          $set: {
            status: 'reserved',
            reservedBy: userId,
            reservedAt: now,
            reservedUntil: expiresAt
          }
        },
        { new: true } // Return updated document
      );

      if (product) {
        reservedProducts.push(product);
        console.log(`✅ Reserved product: ${product.title} (${product._id})`);
      } else {
        unavailableProducts.push(id);
        console.log(`❌ Could not reserve product: ${id}`);
      }
    }

    if (unavailableProducts.length > 0) {
      console.warn(`⚠️ ${unavailableProducts.length} products unavailable`);
      return res.status(409).json({
        error: 'Some products are unavailable',
        reserved: reservedProducts,
        unavailable: unavailableProducts
      });
    }

    console.log(`✅ Successfully reserved ${reservedProducts.length} products for user ${userId}`);
    
    res.json({
      success: true,
      reserved: reservedProducts,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('❌ Error reserving products:', err);
    res.status(500).json({ error: err.message });
  }
});


// ✅ Add this endpoint in server.js (after other routes)
// server.js

// Ensure this middleware is at the TOP of your file
app.use(express.json()); 

app.post('/api/release-reservations', async (req, res) => {
  try {
    const { productIds, userId } = req.body;

    // Log this to your terminal so you can see if the "leave page" trigger works
    console.log(`Attempting to release items for user: ${userId}`);

    if (!productIds || !userId || productIds.length === 0) {
      return res.status(200).json({ message: "Nothing to release" });
    }

    // Convert string IDs to ObjectIds if your Schema requires it
    // If you're using Mongoose, it usually handles the string-to-ObjectId conversion automatically
    const result = await Product.updateMany(
      { 
        _id: { $in: productIds }, 
        reservedBy: userId 
      },
      { 
        $set: { 
          reservedBy: null, 
          reservedUntil: null,
          status: "available" // Or whatever your 'not reserved' status is
        } 
      }
    );

    console.log(`✅ Released ${result.modifiedCount} items.`);
    res.status(200).json({ message: "Reservations released" });
  } catch (err) {
    console.error("Release error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get('/api/check-reservation/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const now = new Date();

    const reservedProducts = await Product.find({
      reservedBy: userId,
      reservedUntil: { $gt: now },
      status: 'reserved',
    });

    if (reservedProducts.length === 0) {
      return res.json({ hasReservation: false});
    }

    const earliestExpiry = reservedProducts.reduce((earliest, product) => {
      return product.reservedUntil < earliest ? product.reservedUntil : earliest;
    }, reservedProducts[0].reservedUntil);

    res.json({
      hasReservation: true,
      products: reservedProducts,
      expiresAt: earliestExpiry,
      timeRemaining: earliestExpiry - now,
    });
  } catch (err) {
    console.error('❌ Error checking reservations:', err);
    res.status(500).json({ error: err.message });
  }
});


// Find this setInterval and update it:
setInterval(async () => {
  try {
    const now = new Date();
    const result = await Product.updateMany(
      {
        status: 'reserved',
        reservedUntil: { $lt: now },
      },
      {
        $set: {
          status: 'for-sale', // ✅ Changed from 'available'
          reservedBy: null,
          reservedAt: null,
          reservedUntil: null,
        }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`🧹 Cleaned up ${result.modifiedCount} expired reservations`);
    }
  } catch (err) {
    console.error('❌ Error cleaning up reservations:', err);
  }
}, 60000); // Every minute

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