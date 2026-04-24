const mongoose = require("mongoose");
const Groq = require("groq-sdk");
const Group = require("../models/Group");
const Message = require("../models/Message");
const GroupSummary = require("../models/GroupSummary");
const User = require("../models/User");
const { normalizeLanguage, toLanguageLabel } = require("../utils/language");
const { isGroupMember, normalizeGroupMembers } = require("../utils/groupMembers");

const cleanSummary = (text) =>
  String(text || "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim();

const getAuthUserId = (req) => req.user?._id || req.user?.userId;
exports.generateGroupSummary = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = getAuthUserId(req);
    const user = await User.findById(userId).select("language").lean();
    const targetLanguageCode = normalizeLanguage(user?.language);
    const targetLanguage = toLanguageLabel(targetLanguageCode);

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ error: "Invalid groupId" });
    }

    const group = await Group.findById(groupId).select("members admin lastSeenMap");
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    normalizeGroupMembers(group);
    if (!isGroupMember(group, userId)) {
      return res.status(403).json({ error: "Not a group member" });
    }

    const lastSeen = group.lastSeenMap?.get(String(userId)) || new Date(0);

    const messages = await Message.find({
      groupId,
      createdAt: { $gt: lastSeen },
      senderId: { $ne: userId },
      text: { $ne: "" },
    })
      .select("text createdAt")
      .sort({ createdAt: 1 })
      .lean();

    if (!messages.length) {
      await GroupSummary.findOneAndUpdate(
        { userId, groupId },
        { summary: null, unreadCount: 0, language: targetLanguageCode, lastGeneratedAt: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return res.status(200).json({ summary: null, unreadCount: 0 });
    }

    const existingSummary = await GroupSummary.findOne({ userId, groupId }).lean();
    const latestUnreadAt = messages[messages.length - 1]?.createdAt;
    if (
      existingSummary &&
      existingSummary.unreadCount === messages.length &&
      existingSummary.language === targetLanguageCode &&
      latestUnreadAt &&
      new Date(existingSummary.lastGeneratedAt).getTime() >= new Date(latestUnreadAt).getTime()
    ) {
      return res.status(200).json({
        summary: existingSummary.summary || null,
        unreadCount: existingSummary.unreadCount || 0,
      });
    }

    const combinedText = messages.map((m) => m.text).join("\n");
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "GROQ_API_KEY is not configured" });
    }

    const summaryPrompt = `
Summarize the following group chat messages into 3 short bullet points.

Rules:
* Ignore greetings (hi, hello, ok)
* Focus only on important information
* Keep it concise
* Write summary in ${targetLanguage}
* Use ONLY pure ${targetLanguage}
* Do NOT mix languages
* Do NOT use Hinglish

Messages:
${combinedText}
`;

    const groq = new Groq({ apiKey });
    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    const summaryResponse = await groq.chat.completions.create({
      model,
      messages: [{ role: "user", content: summaryPrompt.trim() }],
      temperature: 0.2,
    });

    const finalSummary = cleanSummary(summaryResponse?.choices?.[0]?.message?.content || "");

    await GroupSummary.findOneAndUpdate(
      { userId, groupId },
      {
        summary: finalSummary || null,
        unreadCount: messages.length,
        language: targetLanguageCode,
        lastGeneratedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      summary: finalSummary || null,
      unreadCount: messages.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to generate summary" });
  }
};

exports.getGroupSummary = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = getAuthUserId(req);

    const data = await GroupSummary.findOne({ userId, groupId }).lean();
    return res.status(200).json({
      summary: data?.summary || null,
      unreadCount: data?.unreadCount || 0,
      language: data?.language || "en",
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch summary" });
  }
};

exports.markGroupSeen = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = getAuthUserId(req);

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ error: "Invalid groupId" });
    }

    const group = await Group.findById(groupId).select("members admin lastSeenMap");
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    normalizeGroupMembers(group);
    if (!isGroupMember(group, userId)) {
      return res.status(403).json({ error: "Not a group member" });
    }

    group.lastSeenMap.set(String(userId), new Date());
    await group.save();

    await GroupSummary.findOneAndUpdate(
      { userId, groupId },
      { unreadCount: 0 },
      { new: true }
    );

    return res.status(200).json({ message: "Group seen updated" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update seen state" });
  }
};
