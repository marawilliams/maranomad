const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true }, // Firebase UID
  email: { type: String, required: true },
  name: { type: String, default: "" },
  lastname: { type: String, default: "" },
  stripeCustomerId: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
