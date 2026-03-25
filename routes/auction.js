const express = require("express");
const router = express.Router();
const Crop = require("../models/Crop");

// SET BID START & END TIME
router.post("/:cropId/set-bid-time", async (req, res) => {
  const { cropId } = req.params;
  const { farmerId, startTime, endTime } = req.body;

  try {
    const crop = await Crop.findById(cropId);
    if (!crop) return res.status(404).json({ message: "Crop not found" });

    if (crop.farmerId.toString() !== farmerId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    crop.bidStartTime = new Date(startTime);
    crop.bidEndTime = new Date(endTime);
    crop.status = "open";

    await crop.save();
    res.json({ message: "Bid time set successfully", crop });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// PLACE BID (DEALER) 
router.post("/bid/:cropId", async (req, res) => {
  const { cropId } = req.params;
  const { dealerId, dealerName, pricePerKg } = req.body;

  const incomingBid = parseFloat(pricePerKg);
  if (!dealerId || isNaN(incomingBid)) {
    return res.status(400).json({ message: "Invalid bid amount" });
  }

  try {
    const crop = await Crop.findById(cropId);
    if (!crop) return res.status(404).json({ message: "Crop not found" });

    const now = new Date();
    if (!crop.bidStartTime || now < crop.bidStartTime) {
      return res.status(400).json({ message: "Bidding not started yet" });
    }
    if (crop.bidEndTime && now > crop.bidEndTime) {
      crop.status = "closed";
      await crop.save();
      return res.status(400).json({ message: "Bidding closed" });
    }

    // Logic Gate Fix: Clean the string input for safety
    const farmerBasePrice = parseFloat(crop.price?.toString().replace(/[^0-9.]/g, '')) || 0;
    
    let currentHighestBid = 0;
    if (crop.bids && crop.bids.length > 0) {
      currentHighestBid = Math.max(...crop.bids.map(b => parseFloat(b.pricePerKg)));
    }

    const priceToBeat = currentHighestBid > 0 ? currentHighestBid : farmerBasePrice;

    if (incomingBid <= priceToBeat) {
      return res.status(400).json({ 
        message: `Your bid of ₹${incomingBid} must be higher than ₹${priceToBeat}` 
      });
    }

    crop.bids.push({ dealerId, dealerName, pricePerKg: incomingBid, createdAt: now });
    await crop.save();

    const sortedBids = [...crop.bids].sort((a, b) => b.pricePerKg - a.pricePerKg);

    // EMIT VIA SOCKET
    const io = req.app.get("io");
    if (io) {
      io.to(cropId).emit("newBid", { cropId, bids: sortedBids });
    }

    res.json({ message: "Bid placed successfully", bids: sortedBids, status: crop.status });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/bids/:cropId", async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.cropId);
    if (!crop) return res.status(404).json({ message: "Crop not found" });
    const bids = Array.isArray(crop.bids) ? crop.bids : [];
    const sortedBids = [...bids].sort((a, b) => b.pricePerKg - a.pricePerKg);
    res.json({ crop, bids: sortedBids });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;