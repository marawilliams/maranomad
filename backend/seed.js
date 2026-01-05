const mongoose = require("mongoose");
require("dotenv").config();

const Product = require("./models/Product");

const products = [
{
  "title": "Beetle Tee",
  "description": "Heavyweight cotton tee with custom beetle graphic",
  "price": 29.99,
  "category": "t-shirt",
  "size": "xxl",
  "brand": "pro club",
  "images": [
    "https://res.cloudinary.com/dtd5ese9s/image/upload/v1767630347/Subject_kuuulf.png",
    "https://res.cloudinary.com/dtd5ese9s/image/upload/v1767630347/Subject_1_pwd7xm.png"
  ],
  "stock": 1,
  "status": "not-for-sale"
},
{
  "title": "Led Zeppelin Jacket",
  "description": "Denim Jacket with black fabric sewed onto back of garment",
  "price": 29.99,
  "category": "jacket",
  "size": "xl",
  "brand": "gap",
  "images": [
    "https://res.cloudinary.com/dtd5ese9s/image/upload/v1767631204/Subject_3_kxhgzr.png",
    "https://res.cloudinary.com/dtd5ese9s/image/upload/v1767631203/Subject_4_iee2qm.png"
  ],
  "stock": 1,
  "status": "not-for-sale"
}
];

async function seedDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    // Optional: Delete all existing products
    await Product.deleteMany({});
    console.log("Existing products cleared");

    // Insert sample products
    await Product.insertMany(products);
    console.log("Sample products inserted");

    mongoose.disconnect();
  } catch (err) {
    console.error("Error seeding DB:", err);
  }
}

seedDB();
