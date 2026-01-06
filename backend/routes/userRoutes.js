const express = require("express");
const router = express.Router();

// Fetch a user by UID (from Firebase)
router.get("/:uid", async (req, res) => {
  const { uid } = req.params;
  try {
    const userRecord = await require("firebase-admin").auth().getUser(uid);
    res.json({
      uid: userRecord.uid,
      email: userRecord.email,
      name: userRecord.displayName || "",
      // any other fields you want
    });
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(404).json({ error: "User not found" });
  }
});

module.exports = router; // ✅ must export the router instance
