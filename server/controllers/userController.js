const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { isSupportedLanguage, normalizeLanguage } = require("../utils/language");

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.userId } })
      .select("name email bio age profilePic photoURL avatar language authProvider darkMode notifications")
      .sort({ name: 1 });

    const normalizedUsers = users.map((user) => {
      const plainUser = typeof user.toObject === "function" ? user.toObject() : user;
      return {
        ...plainUser,
        profilePic: plainUser.profilePic || plainUser.photoURL || plainUser.avatar || "",
      };
    });

    return res.status(200).json({ users: normalizedUsers });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    const { darkMode, notifications } = req.body;
    const updates = {};

    if (darkMode !== undefined) {
      updates.darkMode = Boolean(darkMode);
    }

    if (notifications !== undefined) {
      updates.notifications = Boolean(notifications);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid preference fields provided" });
    }

    const user = await User.findByIdAndUpdate(req.user.userId, updates, {
      new: true,
      runValidators: true,
      select: "-password",
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Preferences updated successfully",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update preferences",
      error: error.message,
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters long" });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.authProvider !== "local") {
      return res.status(400).json({ message: "Password change is not available for social login accounts" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to change password",
      error: error.message,
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, bio, age, profilePic, language } = req.body;

    const updates = {};

    if (typeof name === "string") updates.name = name.trim();
    if (typeof bio === "string") updates.bio = bio.trim();
    if (profilePic !== undefined) updates.profilePic = String(profilePic || "").trim();
    if (language !== undefined) {
      if (!isSupportedLanguage(language)) {
        return res.status(400).json({ message: "Invalid language value" });
      }
      updates.language = normalizeLanguage(language);
    }

    if (age !== undefined) {
      if (age === "" || age === null) {
        updates.age = null;
      } else {
        const parsedAge = Number(age);
        if (Number.isNaN(parsedAge) || parsedAge < 0) {
          return res.status(400).json({ message: "Age must be a valid non-negative number" });
        }
        updates.age = parsedAge;
      }
    }

    if (updates.name !== undefined && !updates.name) {
      return res.status(400).json({ message: "Name cannot be empty" });
    }

    const user = await User.findByIdAndUpdate(req.user.userId, updates, {
      new: true,
      runValidators: true,
      select: "-password",
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update profile",
      error: error.message,
    });
  }
};
