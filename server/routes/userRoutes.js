const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  getUsers,
  updateProfile,
  updatePreferences,
  changePassword,
} = require("../controllers/userController");

const router = express.Router();

router.get("/", authMiddleware, getUsers);
router.put("/update-profile", authMiddleware, updateProfile);
router.put("/preferences", authMiddleware, updatePreferences);
router.put("/change-password", authMiddleware, changePassword);

module.exports = router;
