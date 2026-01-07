import "dotenv/config";  // loads .env automatically
import admin from "firebase-admin";
import mongoose from "mongoose";
import User from "./models/User.js"; // your MongoDB User model

// Initialize Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY || "{}");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

async function migrateUsers() {
  try {
    const snapshot = await db.collection("users").get();
    if (snapshot.empty) {
      console.log("No users found in Firebase");
      return;
    }

    const users = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      users.push({
        uid: data.uid,
        email: data.email,
        name: data.name || "",
        lastname: data.lastname || "",
        phone: data.phone || "",
        stripeCustomerId: data.stripeCustomerId || "",
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
      });
    });

    const result = await User.insertMany(users, { ordered: false });
    console.log(`✅ Migrated ${result.length} users to MongoDB`);
  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    mongoose.disconnect();
  }
}

// Run migration
migrateUsers();
