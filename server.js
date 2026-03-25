require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const http = require("http");
const fs = require("fs"); 

const User = require("./models/User");
const Crop = require("./models/Crop");
const chatRoutes = require("./routes/chat");
const auctionRoutes = require("./routes/auction");
const bidRoutes = require("./routes/bid"); 

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Create HTTP Server and Socket.io
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: { 
    origin: ["https://agrosetu-frontend.vercel.app", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  }
});

// CRITICAL: Set 'io' BEFORE routes so they can access it
app.set("io", io); 

app.use(cors({
  origin: ["https://agrosetu-frontend.vercel.app", "http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
  credentials: true
}));

// Increased limit for high-res crop photos
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 2. Socket Room Logic
io.on("connection", (socket) => {
  socket.on("joinAuction", (cropId) => {
    socket.join(cropId);
  });
  socket.on("leaveAuction", (cropId) => {
    socket.leave(cropId);
  });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

app.get("/", (req, res) => {
  res.status(200).json({ status: "success", message: "AgroSetu Backend is Live!" });
});

// Routes
app.use("/api/chat", chatRoutes);
app.use("/api/auction", auctionRoutes);
app.use("/api/bid", bidRoutes); 

// Auth
app.post("/api/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already registered." });
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ ...req.body, password: hashed });
    await user.save();
    res.json({ message: "Signup successful" });
  } catch (err) {
    res.status(500).json({ message: "Signup failed" });
  }
});

app.post("/api/signin", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).json({ message: "User not found" });
    const match = await bcrypt.compare(req.body.password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid password" });
    res.json({ message: "Login success", role: user.role, userId: user._id, name: user.name });
  } catch (err) {
    res.status(500).json({ message: "Signin failed" });
  }
});

app.post("/api/farmer/crops", upload.single("image"), async (req, res) => {
  try {
    const farmer = await User.findById(req.body.farmerId);
    if (!farmer) return res.status(404).json({ message: "Farmer not found" });

    // Store the path without a leading slash for better compatibility with frontend API_URL
    const cropImagePath = req.file ? `uploads/${req.file.filename}` : "";

    const crop = new Crop({
      farmerId: farmer._id,
      farmerName: farmer.name,
      location: farmer.location,
      farmSize: farmer.farmSize,
      cropType: farmer.cropType,
      cropName: req.body.cropName,
      quantity: req.body.quantity,
      price: req.body.price, 
      imageUrl: cropImagePath,
      status: "pending",
      bids: [],
    });

    await crop.save();
    res.json({ message: "Crop uploaded successfully", crop });
  } catch (err) {
    console.error("Backend Upload Error:", err); 
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
  .catch(err => {
    console.error("Connection error", err);
  });