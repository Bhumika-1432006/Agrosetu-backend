const express = require("express");
const router = express.Router();
const Crop = require("../models/Crop");

// Place a new bid
router.post("/bid/:cropId", async (req, res) => {
  const { cropId } = req.params;
  const { dealerId, dealerName, pricePerKg } = req.body;

  try {
    const updatedCrop = await Crop.findByIdAndUpdate(
      cropId,
      { 
        $push: { 
          bids: { dealerId, dealerName, pricePerKg: Number(pricePerKg), createdAt: new Date() } 
        } 
      },
      { new: true }
    );
    res.json({ message: "Bid successful", bids: updatedCrop.bids });
  } catch (err) {
    res.status(500).json({ message: "Error saving bid" });
  }
});

// Get bids for a specific crop
router.get("/bids/:cropId", async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.cropId);
    res.json({ crop, bids: crop ? crop.bids : [] });
  } catch (err) {
    res.status(500).json({ message: "Error fetching data" });
  }
});

// Update the bid end time
router.put("/update-time/:cropId", async (req, res) => {
  const { cropId } = req.params;
  const { bidEndTime } = req.body;

  try {
    // 1. Update the crop with the new date and open the status
    const updatedCrop = await Crop.findByIdAndUpdate(
      cropId,
      { 
        bidEndTime: new Date(bidEndTime), 
        status: "open" 
      }, 
      { new: true }
    );

    if (!updatedCrop) {
      return res.status(404).json({ message: "Crop not found" });
    }

    // 2. Safe Socket.io emission
    try {
      const io = req.app.get("io");
      if (io) {
        io.to(cropId).emit("bidTimeUpdated", { cropId, newTime: bidEndTime });
      }
    } catch (socketErr) {
      console.error("Socket error (non-fatal):", socketErr);
    }

    // 3. SEND SUCCESS RESPONSE
    return res.json({ message: "Auction schedule updated successfully!", updatedCrop });

  } catch (err) {
    console.error("Update Bid Time Error:", err);
    return res.status(500).json({ message: "Server error while updating bid time", error: err.message });
  }
});

module.exports = router;