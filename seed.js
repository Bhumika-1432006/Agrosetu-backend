require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User"); // adjust path if needed
const Crop = require("./models/Crop"); // adjust path if needed

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected for seeding"))
  .catch((err) => console.error("DB Connection Error:", err));

async function seed() {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Crop.deleteMany({});

    // ==========================
    // Create sample farmers
    // ==========================
    const farmersData = [
      {
        name: "Farmer John",
        email: "john@farm.com",
        password: await bcrypt.hash("password123", 10),
        role: "farmer",
        farmSize: "5 acres",
        cropType: "Wheat",
        location: "Texas",
      },
      {
        name: "Farmer Mary",
        email: "mary@farm.com",
        password: await bcrypt.hash("password123", 10),
        role: "farmer",
        farmSize: "10 acres",
        cropType: "Corn",
        location: "Iowa",
      },
    ];

    const farmers = await User.insertMany(farmersData);
    console.log("Farmers created:", farmers.map((f) => f.name));

    // ==========================
    // Create sample dealers
    // ==========================
    const dealersData = [
      {
        name: "Dealer Bob",
        email: "bob@dealer.com",
        password: await bcrypt.hash("password123", 10),
        role: "dealer",
        shopName: "Bob's Agri Shop",
        businessType: "Retail",
      },
      {
        name: "Dealer Alice",
        email: "alice@dealer.com",
        password: await bcrypt.hash("password123", 10),
        role: "dealer",
        shopName: "Alice Agro Supplies",
        businessType: "Wholesale",
      },
    ];

    const dealers = await User.insertMany(dealersData);
    console.log("Dealers created:", dealers.map((d) => d.name));

    // ==========================
    // Create sample crops
    // ==========================
    const cropsData = [
      {
        farmerId: farmers[0]._id,
        cropName: "Wheat Premium",
        quantity: "100kg",
        price: "200",
        imageUrl: "/uploads/sample-wheat.jpg",
      },
      {
        farmerId: farmers[0]._id,
        cropName: "Wheat Standard",
        quantity: "50kg",
        price: "100",
        imageUrl: "/uploads/sample-wheat2.jpg",
      },
      {
        farmerId: farmers[1]._id,
        cropName: "Corn Sweet",
        quantity: "200kg",
        price: "300",
        imageUrl: "/uploads/sample-corn.jpg",
      },
    ];

    const crops = await Crop.insertMany(cropsData);
    console.log("Crops created:", crops.map((c) => c.cropName));

    console.log("Seeding completed!");
    process.exit();
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seed();
