const mongoose = require("mongoose");
const { SUPPORTED_LANGUAGE_CODES } = require("../utils/language");

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    text: {
      type: String,
      default: "",
      trim: true,
    },
    type: {
      type: String,
      enum: ["text", "image", "audio"],
      default: "text",
    },
    image: {
      type: String,
      default: "",
      trim: true,
    },
    audioUrl: {
      type: String,
      default: "",
      trim: true,
    },
    duration: {
      type: Number,
      default: 0,
      min: 0,
      max: 120,
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    translatedText: {
      type: String,
      default: "",
      trim: true,
    },
    translatedLanguage: {
      type: String,
      default: "",
      trim: true,
      enum: ["", ...SUPPORTED_LANGUAGE_CODES],
    },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        emoji: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

messageSchema.pre("validate", function validateReceiverOrGroup(next) {
  if (!this.receiverId && !this.groupId) {
    this.invalidate("receiverId", "Either receiverId or groupId is required");
  }
  next();
});

module.exports = mongoose.model("Message", messageSchema);
