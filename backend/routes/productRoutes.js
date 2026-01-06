const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

let cloudinary, multer, upload;

// Try to load cloudinary and multer, but don't fail if not available
try {
  cloudinary = require("cloudinary").v2;
  multer = require("multer");

  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  // Configure multer for memory storage
  const storage = multer.memoryStorage();
  upload = multer({ storage: storage });
} catch (err) {
  console.warn("Cloudinary or multer not available. Image upload will be disabled.");
}

// GET all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find(); // fetch all products
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// ✅ GET a single product by ID
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id); // use MongoDB _id
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// POST create new product
router.post("/", async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    console.error('Error creating product:', err);
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      res.status(400).json({ message: "Validation Error", errors });
    } else {
      res.status(400).json({ message: "Error creating product" });
    }
  }
});

// PUT update product
router.put("/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    console.error('Error updating product:', err);
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      res.status(400).json({ message: "Validation Error", errors });
    } else {
      res.status(400).json({ message: "Error updating product" });
    }
  }
});

// DELETE product
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting product" });
  }
});

// POST upload image to Cloudinary
router.post("/upload", upload ? upload.single("image") : (req, res, next) => next(), async (req, res) => {
  try {
    if (!cloudinary) {
      return res.status(503).json({ message: "Image upload not available. Please install cloudinary and configure credentials." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "fashion-ecommerce",
          transformation: [
            { width: 800, height: 800, crop: "limit" },
            { quality: "auto" }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    res.json({
      url: result.secure_url,
      public_id: result.public_id
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Error uploading image" });
  }
});

module.exports = router;

