const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: false }, // ✅ Changed to false for guest orders
  customerEmail: { type: String, required: true }, // ✅ Added this field

  products: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      title: String,
      quantity: Number,
      price: Number,
      size: String,
      image: String,
    },
  ],

  subtotal: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['paid', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: "paid" 
  },

  // Tracking fields
  trackingNumber: String,
  carrier: String,
  trackingUrl: String,
  shippedAt: Date,

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

  paymentMethod: {
    brand: String,
    last4: String,
    expMonth: Number,
    expYear: Number,
  },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", orderSchema);