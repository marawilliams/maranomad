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

// POST /api/products/:id/reserve
router.post("/:id/reserve", async (req, res) => {
  const { id } = req.params;
  const { uid } = req.body; // logged-in user UID

  const product = await Product.findById(id);

  // Already reserved?
  if (product.reservedBy && product.reservedBy !== uid) {
    return res.status(400).json({ message: "Product is reserved by another user" });
  }

  product.reservedBy = uid;
  product.reservedAt = new Date();

  await product.save();

  res.json({ message: "Product reserved" });
});


router.get("/availability", async (req, res) => {
  try {
    const { ids, uid } = req.query;
    
    if (!ids) return res.json({ unavailableIds: [] });

    const idArray = ids.split(",");
    const now = new Date();

    // Logic: An item is unavailable if:
    // 1. It is marked as "sold"
    // 2. OR it is reserved by SOMEONE ELSE and the timer hasn't expired yet
    const unavailableProducts = await Product.find({
      _id: { $in: idArray },
      $or: [
        { status: "sold" },
        {
          reservedBy: { $ne: uid }, // Not me
          reservedUntil: { $gt: now } // Timer is still running
        }
      ]
    }).select("_id");

    const unavailableIds = unavailableProducts.map(p => p._id.toString());
    res.json({ unavailableIds });
  } catch (err) {
    console.error("Availability check error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});


router.post("/:id/reserve", async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.body; 

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.status === "sold") {
      return res.status(400).json({ error: true, message: "Product is already sold" });
    }

    const now = new Date();

    // Check if reserved by ANOTHER user AND time hasn't expired
    if (
      product.reservedBy && 
      product.reservedBy !== uid && 
      product.reservedUntil && 
      product.reservedUntil > now
    ) {
      return res.status(400).json({ 
        error: true, 
        message: "Item is currently being checked out by another customer." 
      });
    }

    // ✅ Set 1 Hour Timer
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    product.reservedBy = uid;
    product.reservedUntil = oneHourFromNow;
    
    await product.save();

    res.json({ 
      message: "Product reserved", 
      reservedUntil: oneHourFromNow 
    });

  } catch (err) {
    console.error("Reservation error:", err);
    res.status(500).json({ message: "Server error during reservation" });
  }
});

router.post("/release", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "No User ID provided" });

    // Find all products reserved by this user and clear the reservation
    await Product.updateMany(
      { reservedBy: userId },
      { 
        $set: { 
          reservedBy: null, 
          reservedUntil: null 
        } 
      }
    );

    res.json({ message: "Products released" });
  } catch (err) {
    console.error("Release error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});
module.exports = router;

