const express = require("express");
const multer = require("multer");
const { register, login, getMe, auth0Login, logout } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post("/register", upload.single("profilePic"), register);
router.post("/login", login);
router.post("/auth0-login", auth0Login);
router.post("/logout", logout);
router.get("/me", authMiddleware, getMe);

module.exports = router;
