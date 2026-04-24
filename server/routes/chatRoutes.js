const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { deleteChat } = require("../controllers/chatController");

const router = express.Router();

router.delete("/:chatId", authMiddleware, deleteChat);

module.exports = router;

