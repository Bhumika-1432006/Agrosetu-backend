const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Crop = require("../models/Crop");

// ==========================================
// SET BID START & END TIME (FARMER)
// ==========================================
router.post("/:cropId/set-bid-time", async (req, res) => {
  const { cropId } = req.params;
  const { farmerId, startTime, endTime } = req.body;

  if (!farmerId || !startTime || !endTime) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    const crop = await Crop.findById(cropId);
    if (!crop) return res.status(404).json({ message: "Crop not found" });

    if (crop.farmerId.toString() !== farmerId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    crop.bidStartTime = new Date(startTime);
    crop.bidEndTime = new Date(endTime);
    crop.status = "open";

    if (!Array.isArray(crop.bids)) crop.bids = [];

    await crop.save();
    res.json({ message: "Bid time set successfully", crop });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ==========================================
// PLACE BID (DEALER) - THE "280 vs 270" FIX
// ==========================================
router.post("/bid/:cropId", async (req, res) => {
  const { cropId } = req.params;
  const { dealerId, dealerName, pricePerKg } = req.body;

  // FORCE EVERYTHING TO NUMBERS
  const incomingBid = Number(pricePerKg);

  if (!dealerId || isNaN(incomingBid)) {
    return res.status(400).json({ message: "Invalid bid amount" });
  }

  try {
    const crop = await Crop.findById(cropId);
    if (!crop) return res.status(404).json({ message: "Crop not found" });

    const now = new Date();

    // Timing Checks
    if (!crop.bidStartTime || now < crop.bidStartTime) {
      return res.status(400).json({ message: "Bidding not started yet" });
    }
    if (crop.bidEndTime && now > crop.bidEndTime) {
      crop.status = "closed";
      await crop.save();
      return res.status(400).json({ message: "Bidding closed" });
    }

    // --- THE LOGIC GATE ---
    
    // 1. Convert Farmer's base price to Number
    const farmerBasePrice = Number(crop.price) || 0;

    // 2. Get the Highest current bid from the array
    let currentHighestBid = 0;
    if (crop.bids && crop.bids.length > 0) {
      currentHighestBid = Math.max(...crop.bids.map(b => Number(b.pricePerKg)));
    }

    // 3. Determine the actual floor (The "Setu" Floor)
    // If no one has bid yet, the floor is the Farmer's price.
    // If bids exist, the floor is the highest bid.
    const priceToBeat = currentHighestBid > 0 ? currentHighestBid : farmerBasePrice;

    // 4. THE STRICT CHECK
    // This stops the 270 vs 280 error.
    if (incomingBid <= priceToBeat) {
      return res.status(400).json({ 
        message: `Your bid of ₹${incomingBid} must be HIGHER than ₹${priceToBeat}` 
      });
    }

    // --- SUCCESS ---
    crop.bids.push({
      dealerId,
      dealerName,
      pricePerKg: incomingBid, // Store as number for future calculations
      createdAt: now,
    });

    await crop.save();

    const sortedBids = [...crop.bids].sort((a, b) => b.pricePerKg - a.pricePerKg);
    res.json({ message: "Bid placed successfully", bids: sortedBids, status: crop.status });

  } catch (err) {
    console.error("Bid Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ==========================================
// GET ALL BIDS FOR A CROP
// ==========================================
router.get("/bids/:cropId", async (req, res) => {
  const { cropId } = req.params;
  try {
    const crop = await Crop.findById(cropId);
    if (!crop) return res.status(404).json({ message: "Crop not found" });
    const bids = Array.isArray(crop.bids) ? crop.bids : [];
    const sortedBids = [...bids].sort((a, b) => b.pricePerKg - a.pricePerKg);
    res.json({ crop, bids: sortedBids });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;