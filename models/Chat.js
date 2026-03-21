const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    cropId: { type: mongoose.Schema.Types.ObjectId, ref: "Crop", required: true },
    messages: [
      {
        senderRole: { type: String, enum: ["farmer", "dealer"], required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chat", chatSchema);
