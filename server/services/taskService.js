const Group = require("../models/Group");
const Task = require("../models/Task");
const User = require("../models/User");
const { extractTaskFromMessage } = require("../utils/taskExtraction");
const { normalizeLanguage } = require("../utils/language");
const { getSocketServer, getUserSocket } = require("../utils/socketState");
const { getGroupMemberIds } = require("../utils/groupMembers");

const isDuplicateTask = async ({ userId, chatId, text }) => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const existing = await Task.findOne({
    userId,
    chatId,
    text,
    completed: false,
    createdAt: { $gte: oneHourAgo },
  }).lean();
  return Boolean(existing);
};

const createTaskForMessage = async ({ senderId, receiverId, groupId, text }) => {
  if (!text || !String(text).trim()) return;

  let targetUsers = [];
  if (groupId) {
    const group = await Group.findById(groupId).select("members admin").lean();
    if (!group) return;
    targetUsers = getGroupMemberIds(group);
  } else if (senderId && receiverId) {
    targetUsers = [String(senderId), String(receiverId)];
  } else {
    return;
  }

  const io = getSocketServer();
  const users = await User.find({ _id: { $in: targetUsers } }).select("_id language").lean();
  const languageMap = new Map(users.map((user) => [String(user._id), normalizeLanguage(user.language)]));

  for (const userId of targetUsers) {
    let extraction;
    try {
      extraction = await extractTaskFromMessage(text, languageMap.get(String(userId)) || "en");
    } catch {
      continue;
    }

    if (!extraction?.title) continue;

    const chatId =
      groupId
        ? groupId
        : String(userId) === String(senderId)
          ? receiverId
          : senderId;

    const duplicate = await isDuplicateTask({
      userId,
      chatId,
      text: extraction.title,
    });
    if (duplicate) continue;

    const task = await Task.create({
      userId,
      chatId,
      text: extraction.title,
      title: extraction.title,
      description: extraction.description || extraction.title,
      dueDate: extraction.dueDate || null,
      priority: extraction.priority || "medium",
      completed: false,
    });

    const socketId = getUserSocket(userId);
    if (socketId && io) {
      io.to(socketId).emit("taskCreated", task);
    }
  }
};

module.exports = { createTaskForMessage };
