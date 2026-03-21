const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Chat = require("../models/Chat"); // Your Chat model

// ==============================
// Start or get existing chat
// ==============================
router.post("/start", async (req, res) => {
  const { dealerId, farmerId, cropId } = req.body;

  if (!dealerId || !farmerId || !cropId) {
    console.log("Missing fields in request body:", req.body);
    return res.status(400).json({ message: "Missing dealerId, farmerId, or cropId" });
  }

  try {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(dealerId) ||
        !mongoose.Types.ObjectId.isValid(farmerId) ||
        !mongoose.Types.ObjectId.isValid(cropId)) {
      return res.status(400).json({ message: "Invalid dealerId, farmerId, or cropId" });
    }

    // Find existing chat
    let chat = await Chat.findOne({ dealerId, farmerId, cropId });

    if (!chat) {
      chat = new Chat({ dealerId, farmerId, cropId, messages: [] });
      await chat.save();
    }

    res.json(chat);
  } catch (err) {
    console.error("Start chat failed:", err);
    res.status(500).json({ message: "Failed to start chat" });
  }
});

// ==============================
// Get chat by ID
// ==============================
router.get("/:chatId", async (req, res) => {
  const { chatId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    return res.status(400).json({ message: "Invalid chatId" });
  }

  try {
    const chat = await Chat.findById(chatId)
      .populate("dealerId", "name shopName")
      .populate("farmerId", "name")
      .populate("cropId", "cropName");

    if (!chat) return res.status(404).json({ message: "Chat not found" });

    res.json(chat);
  } catch (err) {
    console.error("Get chat error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ==============================
// Send message in a chat
// ==============================
router.post("/:chatId/message", async (req, res) => {
  const { chatId } = req.params;
  const { senderRole, text } = req.body;

  if (!chatId || !senderRole || !text) {
    console.log("Missing fields in send message request:", req.body);
    return res.status(400).json({ message: "Missing chatId, senderRole, or text" });
  }

  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    return res.status(400).json({ message: "Invalid chatId" });
  }

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    chat.messages.push({ senderRole, text });
    await chat.save();

    // Return updated chat with populated fields
    const updatedChat = await Chat.findById(chatId)
      .populate("dealerId", "name shopName")
      .populate("farmerId", "name")
      .populate("cropId", "cropName");

    res.json(updatedChat);
  } catch (err) {
    console.error("Send message failed:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ==============================
// Get all chats for a farmer
// ==============================
router.get("/farmer/:farmerId", async (req, res) => {
  try {
    const { farmerId } = req.params;

    const chats = await Chat.find({ farmerId })
      .populate("dealerId", "name shopName")
      .populate("cropId", "cropName")
      .sort({ createdAt: -1 });

    res.json(chats);
  } catch (err) {
    console.error("Fetch farmer chats failed:", err);
    res.status(500).json({ message: "Failed to fetch chats" });
  }
});

// ==============================
// Get all chats for a dealer
// ==============================
router.get("/dealer/:dealerId", async (req, res) => {
  try {
    const { dealerId } = req.params;

    const chats = await Chat.find({ dealerId })
      .populate("farmerId", "name")
      .populate("cropId", "cropName")
      .sort({ createdAt: -1 });

    res.json(chats);
  } catch (err) {
    console.error("Fetch dealer chats failed:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
