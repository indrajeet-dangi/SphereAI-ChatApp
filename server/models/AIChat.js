const mongoose = require("mongoose");

const aiChatMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ["ai_user", "user"],
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const aiChatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    messages: {
      type: [aiChatMessageSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AIChat", aiChatSchema);

