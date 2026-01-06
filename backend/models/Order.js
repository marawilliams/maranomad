const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // Firebase UID
  orderStatus: { type: String, default: "Pending" },
  subtotal: { type: Number, required: true },
  products: [
    {
      id: String,
      title: String,
      price: Number,
      quantity: Number,
      size: String,
      brand: String
    }
  ],
  data: {
    firstName: String,
    lastName: String,
    address: String,
    apartment: String,
    city: String,
    region: String,
    postalCode: String,
    country: String,
    phone: String
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Order", orderSchema);
