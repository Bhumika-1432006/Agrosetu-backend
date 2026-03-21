const mongoose = require("mongoose");

const CropSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  farmerName: String,
  location: String,
  farmSize: String,
  cropType: String,

  cropName: { type: String, required: true },
  quantity: { type: String, required: true },
  price: { type: String, required: true },
  imageUrl: String,

  // Auction fields
  status: { type: String, enum: ["pending", "open", "closed"], default: "pending" },
  bidStartTime: Date,
  bidEndTime: Date,
  bids: [
    {
      dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      dealerName: String,
      pricePerKg: Number,
      createdAt: { type: Date, default: Date.now },
    },
  ],

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Crop || mongoose.model("Crop", CropSchema);
