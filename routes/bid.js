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

// Update the bid end time (The "Update Schedule" fix)
router.put("/update-time/:cropId", async (req, res) => {
  const { cropId } = req.params;
  const { bidTime } = req.body; // Ensure this matches your Frontend body key!

  try {
    const updatedCrop = await Crop.findByIdAndUpdate(
      cropId,
      { bidTime: bidTime }, // This must match the field name in your Crop Model
      { new: true }
    );

    if (!updatedCrop) {
      return res.status(404).json({ message: "Crop not found" });
    }

    // Optional: Emit socket event if you want it to update for everyone instantly
    const io = req.app.get("io");
    io.to(cropId).emit("bidTimeUpdated", { cropId, newTime: bidTime });

    res.json({ message: "Bid time updated successfully", updatedCrop });
  } catch (err) {
    console.error("Update Bid Time Error:", err);
    res.status(500).json({ message: "Server error while updating bid time" });
  }
});

module.exports = router;