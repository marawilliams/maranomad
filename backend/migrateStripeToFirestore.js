/*
One-off migration script: list Stripe PaymentIntents (or Charges) and write matching order docs to Firestore.
Run with: node migrateStripeToFirestore.js (ensure env vars and serviceAccountKey.json available)
*/
require('dotenv').config();
const Stripe = require('stripe');
const admin = require('firebase-admin');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
  try {
    console.log('Listing payment intents...');
    let starting_after = null;
    let count = 0;
    while (true) {
      const params = { limit: 100 };
      if (starting_after) params.starting_after = starting_after;
      const resp = await stripe.paymentIntents.list(params);
      if (!resp.data || resp.data.length === 0) break;

      for (const pi of resp.data) {
        // Try to find firebase uid via metadata or customer email
        const metadata = pi.metadata || {};
        const firebaseUid = metadata.firebaseUid || null;
        let userId = firebaseUid;

        if (!userId) {
          // try to find user by email in Firestore users collection
          const customer = pi.customer ? await stripe.customers.retrieve(pi.customer) : null;
          const email = customer?.email || pi.receipt_email || null;
          if (email) {
            const q = await db.collection('users').where('email', '==', email).limit(1).get();
            if (!q.empty) userId = q.docs[0].id;
          }
        }

        const orderDoc = {
          stripeId: pi.id,
          userId: userId || null,
          amount: (pi.amount_received || pi.amount) / 100,
          currency: pi.currency,
          status: pi.status,
          createdAt: new Date(pi.created * 1000),
          raw: pi,
        };

        // Use stripe id as doc id to avoid duplicates
        await db.collection('orders').doc(pi.id).set(orderDoc, { merge: true });
        count++;
        console.log('Saved order', pi.id);
      }

      starting_after = resp.data[resp.data.length - 1].id;
      if (!resp.has_more) break;
    }
    console.log('Done. Imported', count, 'orders.');
  } catch (err) {
    console.error('Migration error:', err);
  }
}

run();
