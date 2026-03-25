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

    if (crop.farmerId.toString() !== farmerId.toString()) {
      return res.status(403).json({ 
        message: "Unauthorized: You are not the owner of this crop" 
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid date format provided" });
    }

    // Determine status based on live comparison
    let currentStatus = "pending";
    if (now >= start && now <= end) {
      currentStatus = "open";
    } else if (now > end) {
      currentStatus = "closed";
    }

    crop.bidStartTime = start;
    crop.bidEndTime = end;
    crop.status = currentStatus;

    await crop.save();

    const io = req.app.get("io");
    if (io) {
      io.to(cropId).emit("bidTimeUpdated", { 
        cropId, 
        status: currentStatus, 
        endTime: end 
      });
    }

    res.json({ message: `Auction is now ${currentStatus.toUpperCase()}!`, crop });

  } catch (err) {
    console.error("SET BID TIME ERROR:", err);
    res.status(500).json({ message: "Server error setting bid time" });
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
    const startTime = new Date(crop.bidStartTime);
    const endTime = new Date(crop.bidEndTime);
    
    if (!crop.bidStartTime || now < startTime) {
      return res.status(400).json({ message: "Bidding not started yet" });
    }
    
    if (now > endTime) {
      if (crop.status !== "closed") {
        crop.status = "closed";
        await crop.save();
      }
      return res.status(400).json({ message: "Bidding closed" });
    }

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

    crop.bids.push({ 
      dealerId, 
      dealerName: dealerName || "Anonymous", 
      pricePerKg: incomingBid, 
      createdAt: now 
    });
    
    await crop.save();

    const sortedBids = [...crop.bids].sort((a, b) => b.pricePerKg - a.pricePerKg);

    const io = req.app.get("io");
    if (io) {
      io.to(cropId).emit("newBid", { cropId, bids: sortedBids });
    }

    res.json({ message: "Bid placed successfully", bids: sortedBids, status: crop.status });

  } catch (err) {
    console.error("BID ERROR:", err);
    res.status(500).json({ message: "Server error placing bid" });
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