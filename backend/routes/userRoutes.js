const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const User = require("../models/User");
const Order = require("../models/Order");

// GET user profile by UID
router.get("/:uid", async (req, res) => {
  const { uid } = req.params;

  try {
    // Try to find user in MongoDB first
    let user = await User.findOne({ uid });

    if (!user) {
      // If not in MongoDB, get from Firebase Auth and create in MongoDB
      const userRecord = await admin.auth().getUser(uid);
      
      user = new User({
        uid: userRecord.uid,
        email: userRecord.email || "",
        name: userRecord.displayName || "",
        lastname: "",
      });
      
      await user.save();
    }

    res.json({
      uid: user.uid,
      email: user.email,
      name: user.name || "",
      lastname: user.lastname || "",
      phone: user.phone || "",
      stripeCustomerId: user.stripeCustomerId || "",
    });
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(404).json({ message: "User not found" });
  }
});

// PUT update user profile
router.put("/:uid", async (req, res) => {
  const { uid } = req.params;
  const { name, lastname, email, phone } = req.body;

  try {
    // Find and update user in MongoDB
    let user = await User.findOne({ uid });

    if (!user) {
      // Create user if doesn't exist
      user = new User({
        uid,
        email,
        name,
        lastname,
        phone,
      });
    } else {
      // Update existing user
      user.name = name || user.name;
      user.lastname = lastname || user.lastname;
      user.email = email || user.email;
      user.phone = phone || user.phone;
    }

    await user.save();

    res.json({
      uid: user.uid,
      email: user.email,
      name: user.name,
      lastname: user.lastname,
      phone: user.phone,
      stripeCustomerId: user.stripeCustomerId,
    });
  } catch (err) {
    console.error("Failed to update user:", err);
    res.status(500).json({ message: "Failed to update user" });
  }
});

// DELETE /api/users/:uid
router.delete("/:uid", async (req, res) => {
  const { uid } = req.params;

  try {
    // 1️⃣ Delete Firebase Authentication user (password/auth)
    await admin.auth().deleteUser(uid);
    console.log("✅ Firebase Auth user deleted:", uid);

    // 2️⃣ Delete user from MongoDB
    await User.findOneAndDelete({ uid });
    console.log("✅ MongoDB user deleted:", uid);

    // 3️⃣ Anonymize orders in MongoDB (keep for compliance/records)
    const result = await Order.updateMany(
      { userId: uid },
      {
        $set: {
          userId: null, // detach from deleted user
          "shippingAddress.firstName": "Deleted",
          "shippingAddress.lastName": "User",
          "shippingAddress.phone": null,
        },
        $unset: {
          customerEmail: "",
        },
      }
    );

    console.log(`✅ ${result.modifiedCount} orders anonymized`);

    res.json({ 
      message: "User deleted and orders anonymized",
      ordersAnonymized: result.modifiedCount 
    });
  } catch (err) {
    console.error("❌ Error deleting user:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;