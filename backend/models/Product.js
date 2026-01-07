// backend/models/Product.js
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  images: {
    type: [String],
    validate: {
      validator: function(v) {
        return v && v.length >= 1 && v.every(url => url && url.trim().length > 0);
      },
      message: "At least one valid image URL is required"
    }
  },
  size: { type: String, required: true },
  brand: { type: String },
  stock: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["for-sale", "not-for-sale", "sold"],
    default: "not-for-sale",
  },
  // ✅ NEW FIELDS FOR RESERVATION SYSTEM
  reservedBy: { type: String, default: null }, // Stores the Firebase UID
  reservedUntil: { type: Date, default: null }, // Stores the expiration timestamp
});

module.exports = mongoose.model("Product", productSchema, "products");