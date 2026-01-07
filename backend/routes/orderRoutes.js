const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

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
