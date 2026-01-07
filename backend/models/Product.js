const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  price: { type: Number, required: true },
  description: String,
  brand: String,
  images: [String],
  category: String,
  
  // ✅ Status field
  status: { 
    type: String, 
    enum: ['available', 'for-sale', 'reserved', 'sold'], 
    default: 'available' 
  },
  
  // ✅ Reservation fields
  reservedBy: { type: String, default: null },
  reservedAt: { type: Date, default: null },
  reservedUntil: { type: Date, default: null },
  
  // ✅ Sold fields (optional)
  soldAt: { type: Date },
  soldTo: { type: String },
  
  createdAt: { type: Date, default: Date.now },
});

// ✅ Index for efficient queries
productSchema.index({ status: 1, reservedUntil: 1 });

module.exports = mongoose.model("Product", productSchema);