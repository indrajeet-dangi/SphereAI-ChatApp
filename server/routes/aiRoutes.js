const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  getAIChat,
  createAIChat,
  chatWithAI,
  getReplySuggestions,
  analyzeMessageTone,
  correctGrammar,
} = require("../controllers/aiController");

const router = express.Router();

router.get("/chat", authMiddleware, getAIChat);
router.post("/chat/create", authMiddleware, createAIChat);
router.post("/chat", authMiddleware, chatWithAI);
router.post("/suggestions", authMiddleware, getReplySuggestions);
router.post("/analyze", authMiddleware, analyzeMessageTone);
router.post("/correct-grammar", authMiddleware, correctGrammar);

module.exports = router;
