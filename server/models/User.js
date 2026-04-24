const mongoose = require("mongoose");
const { SUPPORTED_LANGUAGE_CODES } = require("../utils/language");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function requiredPassword() {
        return this.authProvider === "local";
      },
    },
    bio: {
      type: String,
      default: "",
      trim: true,
    },
    age: {
      type: Number,
      min: 0,
    },
    profilePic: {
      type: String,
      default: "",
      trim: true,
    },
    language: {
      type: String,
      default: "en",
      enum: SUPPORTED_LANGUAGE_CODES,
    },
    googleId: {
      type: String,
      default: null,
    },
    authProvider: {
      type: String,
      enum: ["local", "auth0"],
      default: "local",
    },
    darkMode: {
      type: Boolean,
      default: false,
    },
    notifications: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
