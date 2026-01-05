// backend/models/Product.js
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  images: {
    type: [String], // array of image URLs
    validate: {
      validator: v => v.length >= 1,
      message: "At least one image is required"
    }
  },
  stock: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["for-sale", "not-for-sale", "sold"],
    default: "not-for-sale",
  }
});

module.exports = mongoose.model("Product", productSchema, "products");
