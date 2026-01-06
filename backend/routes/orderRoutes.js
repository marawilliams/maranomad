const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

// Get orders for a user
router.get("/:uid", async (req, res) => {
  const { uid } = req.params;
  try {
    const snapshot = await admin.firestore().collection("orders")
      .where("userId", "==", uid)
      .orderBy("createdAt", "desc")
      .get();

    const orders = snapshot.docs.map(doc => doc.data());
    res.json(orders);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

module.exports = router;
