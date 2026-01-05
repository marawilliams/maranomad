const mongoose = require("mongoose");
require("dotenv").config();

const Product = require("./models/Product");

const products = [
  {
    title: "Beetle Tee",
    image: "beetletee.png",
    imageback: "beleteteeback.png",
    category: "none",
    price: 29.99,
    popularity: 50,
    stock: 100,
  },
  {
    title: "Classic Hoodie",
    image: "classic-hoodie.png",
    imageback: "classic-hoodie-back.png",
    category: "hoodies",
    price: 59.99,
    popularity: 75,
    stock: 50,
  },
  {
    title: "Sneaker X",
    image: "sneakerx.png",
    imageback: "sneakerx-back.png",
    category: "shoes",
    price: 89.99,
    popularity: 90,
    stock: 30,
  },
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
