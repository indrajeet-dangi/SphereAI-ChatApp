const Groq = require("groq-sdk");
const User = require("../models/User");
const AIChat = require("../models/AIChat");
const {
  normalizeLanguage,
  toLanguageLabel,
  getLanguageResponseInstruction,
} = require("../utils/language");

const cleanOutput = (text) =>
  String(text || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim();

const getAuthUserId = (req) => req.user?._id || req.user?.userId;

const extractJsonObject = (text) => {
  const raw = String(text || "");
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return "";
  return raw.slice(start, end + 1);
};

const getUserLanguageCode = async (userId) => {
  if (!userId) return "en";
  const user = await User.findById(userId).select("language").lean();
  return normalizeLanguage(user?.language);
};

const createGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return new Groq({ apiKey });
};

const getModel = () => process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const AI_USER_ID = "ai_user";
const AI_GREETING_TEXT = "Welcome to Sphere AI. I'm here to help you with anything. Ask me anything!";

const buildAIChatDescriptor = () => ({
  _id: AI_USER_ID,
  id: AI_USER_ID,
  type: "ai",
  isGroup: false,
  isAI: true,
  name: "Sphere AI",
  chatKey: "ai:assistant",
  profilePic: "/ai-logo.png",
  avatar: "/ai-logo.png",
  email: "ai@sphere.com",
  status: "online",
  bio: "Your intelligent AI assistant for smart conversations.",
  forceOnline: true,
});

const ensureWelcomeMessage = async (userId) => {
  const existing = await AIChat.findOne({ userId });

  if (!existing) {
    return AIChat.create({
      userId,
      messages: [
        {
          sender: AI_USER_ID,
          text: AI_GREETING_TEXT,
        },
      ],
    });
  }

  const hasWelcome = Array.isArray(existing.messages)
    ? existing.messages.some((msg) => String(msg?.sender) === AI_USER_ID)
    : false;

  if (!hasWelcome) {
    existing.messages.unshift({
      sender: AI_USER_ID,
      text: AI_GREETING_TEXT,
      createdAt: new Date(),
    });
    await existing.save();
  }

  return existing;
};

exports.getAIChat = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const aiChat = await ensureWelcomeMessage(userId);
    return res.status(200).json({
      chat: buildAIChatDescriptor(),
      messages: aiChat.messages || [],
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || "Failed to fetch AI chat",
    });
  }
};

exports.createAIChat = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const aiChat = await ensureWelcomeMessage(userId);
    return res.status(200).json({
      chat: buildAIChatDescriptor(),
      messages: aiChat.messages || [],
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || "Failed to create AI chat",
    });
  }
};

exports.chatWithAI = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = getAuthUserId(req);
    const langCode = await getUserLanguageCode(userId);
    const langLabel = toLanguageLabel(langCode);
    const groq = createGroqClient();

    if (!groq) {
      return res.status(500).json({ error: "GROQ_API_KEY is not configured" });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const response = await groq.chat.completions.create({
      model: getModel(),
      messages: [
        {
          role: "system",
          content: `You are a helpful chat assistant. ${getLanguageResponseInstruction(langCode)} Keep responses concise and useful.`,
        },
        { role: "user", content: String(message).trim() },
      ],
      temperature: 0.4,
    });

    return res.status(200).json({
      reply:
        cleanOutput(response?.choices?.[0]?.message?.content) ||
        (langCode === "en" ? "I could not generate a reply." : ""),
      language: langCode,
      languageLabel: langLabel,
    });
  } catch (error) {
    const status = Number(error?.status) || 500;
    const safeStatus = status >= 400 && status <= 599 ? status : 500;
    const message = error?.error?.message || error?.message || "Unknown AI error";

    return res.status(safeStatus).json({
      error: "AI error",
      message,
    });
  }
};

exports.getReplySuggestions = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = getAuthUserId(req);
    const langCode = await getUserLanguageCode(userId);
    const langLabel = toLanguageLabel(langCode);
    const groq = createGroqClient();

    if (!groq) {
      return res.status(500).json({ error: "GROQ_API_KEY is not configured" });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const prompt = `
Generate 3 short, natural reply suggestions for this message.

Rules:
* Replies must be short (1 line)
* Should feel human and casual
* Match tone of message
* No explanations
* Return ONLY JSON array
* Generate replies in ${langLabel}
* Use ONLY pure ${langLabel}
* Do NOT mix languages
* Do NOT use Hinglish

Example output:
["Sure, I'll do it", "Got it", "Okay, noted"]

Message:
"${String(message).trim()}"
`;

    const response = await groq.chat.completions.create({
      model: getModel(),
      messages: [{ role: "user", content: prompt.trim() }],
      temperature: 0.2,
    });

    const raw = cleanOutput(response?.choices?.[0]?.message?.content || "");
    let suggestions = [];

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        suggestions = parsed.map((item) => cleanOutput(item)).filter(Boolean).slice(0, 3);
      }
    } catch {
      suggestions = raw
        .split("\n")
        .map((line) => line.replace(/^\s*[-*0-9.)]+\s*/, "").trim())
        .map(cleanOutput)
        .filter(Boolean)
        .slice(0, 3);
    }

    return res.status(200).json({ suggestions, language: langCode });
  } catch (error) {
    const status = Number(error?.status) || 500;
    const safeStatus = status >= 400 && status <= 599 ? status : 500;
    const message = error?.error?.message || error?.message || "Failed to generate suggestions";

    return res.status(safeStatus).json({
      error: "AI suggestion error",
      message,
      suggestions: [],
    });
  }
};

exports.analyzeMessageTone = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = getAuthUserId(req);
    const langCode = await getUserLanguageCode(userId);
    const langLabel = toLanguageLabel(langCode);
    const groq = createGroqClient();

    if (!groq) {
      return res.status(500).json({ error: "GROQ_API_KEY is not configured" });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const prompt = `
Analyze the message for emotional tone or spam.

IMPORTANT:
* If ANY emotional signal exists (sad, stress, anger), DO NOT return "normal"
* Only return "normal" for completely neutral messages
* Be slightly sensitive to emotions
* The "response" MUST be in ${langLabel}
* Use ONLY pure ${langLabel}
* Do NOT mix languages
* Do NOT use Hinglish

Return JSON only:
{
"type": "emotion | spam | normal",
"emotion": "sad | stress | anger | happy | neutral",
"confidence": 0.0-1.0,
"response": "short helpful message"
}

Rules:
* Keep response 1-2 lines
* No explanation
* Natural tone
* NEVER provide medical advice

Message:
"${String(message).trim()}"
`;

    const completion = await groq.chat.completions.create({
      model: getModel(),
      messages: [{ role: "user", content: prompt.trim() }],
      temperature: 0.1,
    });

    const raw = cleanOutput(completion?.choices?.[0]?.message?.content || "");
    const jsonText = extractJsonObject(raw);

    let parsed = null;
    try {
      parsed = JSON.parse(jsonText || raw);
    } catch {
      parsed = null;
    }

    const type = ["emotion", "spam", "normal"].includes(parsed?.type) ? parsed.type : "normal";
    const emotion = ["sad", "stress", "anger", "happy", "neutral"].includes(parsed?.emotion)
      ? parsed.emotion
      : "neutral";
    const confidence = Number(parsed?.confidence);
    const safeConfidence = Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.5;
    const responseText = type === "normal" ? "" : cleanOutput(parsed?.response || "");

    return res.status(200).json({
      type,
      emotion,
      confidence: safeConfidence,
      response: responseText,
      language: langCode,
    });
  } catch (error) {
    const status = Number(error?.status) || 500;
    const safeStatus = status >= 400 && status <= 599 ? status : 500;
    const message = error?.error?.message || error?.message || "Failed to analyze message";
    return res.status(safeStatus).json({
      error: "AI analyze error",
      message,
      type: "normal",
      emotion: "neutral",
      confidence: 0,
      response: "",
    });
  }
};

exports.correctGrammar = async (req, res) => {
  try {
    const { text } = req.body;
    const userId = getAuthUserId(req);
    const langCode = await getUserLanguageCode(userId);
    const langLabel = toLanguageLabel(langCode);
    const groq = createGroqClient();

    if (!groq) {
      return res.status(500).json({ error: "GROQ_API_KEY is not configured" });
    }

    const rawText = String(text || "").trim();
    if (!rawText) {
      return res.status(400).json({ error: "Text is required" });
    }

    const prompt = `
Correct grammar and improve this sentence.
Keep same meaning.
Use ${langLabel}.
Use ONLY pure ${langLabel}.
Do NOT mix languages.
Return only corrected text.

Text:
${rawText}
`;

    const completion = await groq.chat.completions.create({
      model: getModel(),
      messages: [{ role: "user", content: prompt.trim() }],
      temperature: 0.1,
    });

    return res.status(200).json({
      correctedText: cleanOutput(completion?.choices?.[0]?.message?.content || rawText) || rawText,
      language: langCode,
    });
  } catch (error) {
    const status = Number(error?.status) || 500;
    const safeStatus = status >= 400 && status <= 599 ? status : 500;
    return res.status(safeStatus).json({
      error: "AI grammar error",
      message: error?.error?.message || error?.message || "Failed to correct grammar",
    });
  }
};
