const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  name: String,
  lastname: String,
  phone: String,
  stripeCustomerId: String, // important for Stripe
  address: String,
  apartment: String,
  city: String,
  region: String,
  postalCode: String,
  country: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
