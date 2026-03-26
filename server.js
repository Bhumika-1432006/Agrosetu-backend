require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const http = require("http");

// --- CLOUDINARY IMPORTS ---
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const User = require("./models/User");
const Crop = require("./models/Crop");
const chatRoutes = require("./routes/chat");
const auctionRoutes = require("./routes/auction");
const bidRoutes = require("./routes/bid"); 

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Setup Cloudinary Storage Engine
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "agrosetu_crops", // This folder is created in Cloudinary automatically
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});
const upload = multer({ storage });

// 3. Create HTTP Server and Socket.io
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: { 
    origin: ["https://agrosetu-frontend.vercel.app", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  }
});

app.set("io", io); 

app.use(cors({
  origin: ["https://agrosetu-frontend.vercel.app", "http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Socket Logic
io.on("connection", (socket) => {
  socket.on("joinAuction", (cropId) => socket.join(cropId));
  socket.on("leaveAuction", (cropId) => socket.leave(cropId));
});

app.get("/", (req, res) => {
  res.status(200).json({ status: "success", message: "AgroSetu Backend is Live with Cloudinary!" });
});

// Routes
app.use("/api/chat", chatRoutes);
app.use("/api/auction", auctionRoutes);
app.use("/api/bid", bidRoutes); 

// Auth Routes (Signup/Signin) - Keep these as they were...
app.post("/api/signup", async (req, res) => { /* ... existing code ... */ });
app.post("/api/signin", async (req, res) => { /* ... existing code ... */ });

// --- UPDATED CROP UPLOAD ROUTE ---
app.post("/api/farmer/crops", upload.single("image"), async (req, res) => {
  try {
    const farmer = await User.findById(req.body.farmerId);
    if (!farmer) return res.status(404).json({ message: "Farmer not found" });

    // req.file.path now contains the full Cloudinary HTTPS URL
    const cropImageUrl = req.file ? req.file.path : "";

    const crop = new Crop({
      farmerId: farmer._id,
      farmerName: farmer.name,
      location: farmer.location,
      farmSize: farmer.farmSize,
      cropType: farmer.cropType,
      cropName: req.body.cropName,
      quantity: req.body.quantity,
      price: req.body.price, 
      imageUrl: cropImageUrl, // Saving the full cloud URL
      status: "pending",
      bids: [],
    });

    await crop.save();
    res.json({ message: "Crop uploaded to Cloud successfully", crop });
  } catch (err) {
    console.error("Cloud Upload Error:", err); 
    res.status(500).json({ message: "Crop upload failed", error: err.message });
  }
});

app.get("/api/farmer/crops/:farmerId", async (req, res) => {
  const crops = await Crop.find({ farmerId: req.params.farmerId }).sort({ createdAt: -1 });
  res.json(crops);
});

app.get("/api/dealer/crops", async (req, res) => {
  const crops = await Crop.find().sort({ createdAt: -1 });
  res.json(crops);
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB Connected");
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error("Connection error", err));