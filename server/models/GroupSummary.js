const mongoose = require("mongoose");
const { SUPPORTED_LANGUAGE_CODES } = require("../utils/language");

const groupSummarySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    summary: {
      type: String,
      default: null,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
    language: {
      type: String,
      enum: SUPPORTED_LANGUAGE_CODES,
      default: "en",
    },
    lastGeneratedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

groupSummarySchema.index({ userId: 1, groupId: 1 }, { unique: true });

module.exports = mongoose.model("GroupSummary", groupSummarySchema);
