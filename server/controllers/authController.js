const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { uploadToCloudinary } = require("../config/cloudinary");
const { normalizeLanguage } = require("../utils/language");

const createToken = (user) => {
  return jwt.sign(
    {
      userId: String(user._id),
      language: normalizeLanguage(user.language),
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const sanitizeUser = (userDoc) => {
  const user = userDoc.toObject();
  delete user.password;
  return user;
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, bio, age, language } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let profilePic = "";
    if (req.file?.buffer) {
      const uploadedImage = await uploadToCloudinary(req.file.buffer);
      profilePic = uploadedImage.secure_url;
    } else if (req.body.profilePic) {
      profilePic = req.body.profilePic;
    }

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      bio: bio || "",
      age: age ? Number(age) : undefined,
      profilePic,
      language: normalizeLanguage(language),
    });

    const token = createToken(user);

    return res.status(201).json({
      message: "User registered successfully",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to register user",
      error: error.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.authProvider !== "local") {
      return res.status(400).json({
        message: "This account uses Google login. Please continue with Google.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = createToken(user);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to login",
      error: error.message,
    });
  }
};

exports.auth0Login = async (req, res) => {
  try {
    const { name, email, picture, sub, language } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required for Auth0 login" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = await User.create({
        name: name || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        profilePic: picture || "",
        googleId: sub || null,
        authProvider: "auth0",
        language: normalizeLanguage(language),
      });
    } else {
      const shouldUpdate =
        (!user.profilePic && picture) ||
        (user.authProvider === "local" && sub);

      if (shouldUpdate) {
        user.profilePic = user.profilePic || picture;
        if (!user.googleId && sub) user.googleId = sub;
        await user.save();
      }
    }

    const token = createToken(user);

    return res.status(200).json({
      message: "Auth0 login successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to login with Auth0",
      error: error.message,
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch user profile",
      error: error.message,
    });
  }
};

exports.logout = async (req, res) => {
  return res.status(200).json({ message: "Logged out successfully" });
};
