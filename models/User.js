const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["farmer", "dealer"], required: true },
  // Farmer-specific fields
  farmSize: { type: String },
  cropType: { type: String },
  location: { type: String },
  // Dealer-specific fields
  shopName: { type: String },
  businessType: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);