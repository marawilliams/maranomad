require("dotenv").config(); // ✅ FIRST

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Routes
const productRoutes = require("./routes/productRoutes");
app.use("/api/products", productRoutes);

const PORT = process.env.PORT || 5000;

// ✅ Connect DB, then start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => console.log(err));
