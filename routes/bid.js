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

module.exports = router;