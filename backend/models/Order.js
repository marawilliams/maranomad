const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // Firebase UID

  products: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      title: String,
      quantity: Number,
      price: Number,
      size: String,
    },
  ],

  subtotal: { type: Number, required: true },
  status: { type: String, default: "paid" },

  shippingAddress: {
    firstName: String,
    lastName: String,
    address: String,
    apartment: String,
    city: String,
    region: String,
    postalCode: String,
    country: String,
    phone: String,
  },

  paymentIntentId: String,
  refundId: String,

  // ✅ ADD THIS (SAFE TO STORE)
  paymentMethod: {
    brand: String,    // visa, mastercard
    last4: String,    // 4242
    expMonth: Number,
    expYear: Number,
  },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", orderSchema);
