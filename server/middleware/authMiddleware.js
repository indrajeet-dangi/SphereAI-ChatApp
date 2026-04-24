const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { normalizeLanguage } = require("../utils/language");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : "";

    if (!token) {
      return res.status(401).json({ message: "Unauthorized: token missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: invalid token payload" });
    }

    const user = await User.findById(userId).select("language").lean();
    if (!user) {
      return res.status(401).json({ message: "Unauthorized: user no longer exists" });
    }

    req.user = {
      ...decoded,
      userId: String(userId),
      id: String(userId),
      _id: String(userId),
      language: normalizeLanguage(user.language || decoded.language),
    };

    return next();
  } catch (error) {
    console.error("Auth Error:", error?.message || error);
    return res.status(401).json({ message: "Unauthorized: invalid token" });
  }
};

module.exports = authMiddleware;
