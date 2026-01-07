// // backend/routes/products.js (or in your main server.js)
const express = require('express');
const router = express.Router();
const Product = require('../../models/Product'); // Adjust path as needed

// GET all products
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find({ 
      status: { $in: ['for-sale', 'available'] } // Only show available products
    });
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET single product by ID
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

module.exports = router;