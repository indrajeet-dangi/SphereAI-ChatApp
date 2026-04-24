const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { uploadAudio } = require("../middleware/upload");
const {
  getConversations,
  getGroupMessages,
  getMessages,
  createMessage,
  createAudioMessage,
  markReadMessages,
  reactToMessage,
  deleteMessage,
} = require("../controllers/messageController");

const router = express.Router();

router.get("/conversations", authMiddleware, getConversations);
router.get("/group/:groupId", authMiddleware, getGroupMessages);
router.put("/mark-read/:chatId", authMiddleware, markReadMessages);
router.post("/audio", authMiddleware, uploadAudio.single("audio"), createAudioMessage);
router.get("/:userId", authMiddleware, getMessages);
router.post("/", authMiddleware, createMessage);
router.post("/:messageId/react", authMiddleware, reactToMessage);
router.delete("/:messageId", authMiddleware, deleteMessage);

module.exports = router;
