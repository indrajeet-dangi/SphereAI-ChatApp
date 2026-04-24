const mongoose = require("mongoose");
const Message = require("../models/Message");
const User = require("../models/User");
const Group = require("../models/Group");
const { createTaskForMessage } = require("../services/taskService");
const { getSocketServer, getUserSocket } = require("../utils/socketState");
const { getGroupMemberIds, isGroupMember, normalizeGroupMembers } = require("../utils/groupMembers");
const {
  normalizeLanguage,
  translateMessageStrict,
  translateMessagesBatchStrict,
} = require("../utils/translation");

exports.getConversations = async (req, res) => {
  try {
    const currentUserId = String(req.user.userId);

    const conversationMessages = await Message.find({
      groupId: null,
      deletedFor: { $ne: currentUserId },
      $or: [{ senderId: currentUserId }, { receiverId: currentUserId }],
    })
      .select("senderId receiverId")
      .sort({ updatedAt: -1 });

    const uniquePartnerIds = new Set();
    for (const msg of conversationMessages) {
      const senderId = String(msg.senderId);
      const receiverId = String(msg.receiverId);
      if (!receiverId || receiverId === "null" || receiverId === "undefined") continue;
      const partnerId = senderId === currentUserId ? receiverId : senderId;
      if (partnerId !== currentUserId) {
        uniquePartnerIds.add(partnerId);
      }
    }

    const users = await User.find({ _id: { $in: Array.from(uniquePartnerIds) } })
      .select("name profilePic email bio")
      .lean();

    const usersById = new Map(users.map((user) => [String(user._id), user]));
    const orderedUsers = Array.from(uniquePartnerIds)
      .map((id) => usersById.get(id))
      .filter(Boolean);

    return res.status(200).json({ users: orderedUsers });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch conversations",
      error: error.message,
    });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const selectedUserId = req.params.userId;
    const currentUser = await User.findById(currentUserId).select("language").lean();
    const currentUserLanguage = normalizeLanguage(currentUser?.language);

    const messages = await Message.find({
      deletedFor: { $ne: currentUserId },
      $or: [
        { senderId: currentUserId, receiverId: selectedUserId },
        { senderId: selectedUserId, receiverId: currentUserId },
      ],
    }).sort({ createdAt: 1 });

    const mappedMessages = messages.map((msg) => {
      const plain = msg.toObject();
      const isCurrentUserReceiver = String(plain.receiverId) === String(currentUserId);
      const hasMatchingTranslation =
        plain.translatedText &&
        plain.translatedLanguage &&
        plain.translatedLanguage === currentUserLanguage;

      if (isCurrentUserReceiver && hasMatchingTranslation) {
        plain.text = plain.translatedText;
      }

      return plain;
    });

    return res.status(200).json({ messages: mappedMessages });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
};

exports.getGroupMessages = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const groupId = req.params.groupId;
    const currentUser = await User.findById(currentUserId).select("language").lean();
    const currentUserLanguage = normalizeLanguage(currentUser?.language);

    const group = await Group.findById(groupId).select("members admin");
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    normalizeGroupMembers(group);
    if (!isGroupMember(group, currentUserId)) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    const messages = await Message.find({ groupId })
      .populate("senderId", "name profilePic email language")
      .sort({ createdAt: 1 });

    const plainMessages = messages.map((msg) => msg.toObject());
    const translatableMessages = plainMessages.filter((msg) => {
      const senderId = String(msg.senderId?._id || msg.senderId);
      const senderLanguage = normalizeLanguage(msg.senderId?.language);
      return (
        senderId !== String(currentUserId) &&
        Boolean(msg.text?.trim()) &&
        senderLanguage !== currentUserLanguage
      );
    });

    let translatedBatch = [];
    if (translatableMessages.length > 0) {
      translatedBatch = await translateMessagesBatchStrict({
        messages: translatableMessages.map((msg) => msg.text),
        targetLanguage: currentUserLanguage,
      });
    }

    const translatedByMessageId = new Map(
      translatableMessages.map((msg, index) => [String(msg._id), translatedBatch[index] || ""])
    );

    const mappedMessages = plainMessages.map((msg) => ({
      ...msg,
      translatedText: translatedByMessageId.get(String(msg._id)) || "",
    }));

    return res.status(200).json({ messages: mappedMessages });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch group messages",
      error: error.message,
    });
  }
};

exports.createMessage = async (req, res) => {
  try {
    const senderId = req.user.userId;
    const { receiverId, groupId, text = "", image = "" } = req.body;

    if (!receiverId && !groupId) {
      return res.status(400).json({ message: "receiverId or groupId is required" });
    }

    if (!text.trim() && !image.trim()) {
      return res.status(400).json({ message: "Message text or image is required" });
    }

    if (receiverId && !mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: "Invalid receiverId" });
    }

    if (groupId && !mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid groupId" });
    }

    if (groupId) {
      const group = await Group.findById(groupId).select("members admin");
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      normalizeGroupMembers(group);
      if (!isGroupMember(group, senderId)) {
        return res.status(403).json({ message: "You are not a member of this group" });
      }
    }

    let translatedText = "";
    let translatedLanguage = "";
    if (receiverId && text.trim()) {
      const [senderUser, receiverUser] = await Promise.all([
        User.findById(senderId).select("language").lean(),
        User.findById(receiverId).select("language").lean(),
      ]);

      const senderLanguage = normalizeLanguage(senderUser?.language);
      const receiverLanguage = normalizeLanguage(receiverUser?.language);

      if (senderLanguage !== receiverLanguage) {
        translatedText = await translateMessageStrict({
          message: text.trim(),
          targetLanguage: receiverLanguage,
        });
        translatedLanguage = receiverLanguage;
      }
    }

    const message = await Message.create({
      senderId,
      receiverId: receiverId || null,
      groupId: groupId || null,
      type: image.trim() ? "image" : "text",
      text: text.trim(),
      image: image.trim(),
      status: "sent",
      translatedText,
      translatedLanguage,
    });

    let populatedMessage = await Message.findById(message._id).populate("senderId", "name profilePic email");

    if (receiverId && getUserSocket(receiverId)) {
      populatedMessage = await Message.findByIdAndUpdate(
        message._id,
        { status: "delivered" },
        { new: true }
      ).populate("senderId", "name profilePic email");
    }

    createTaskForMessage({
      senderId,
      receiverId,
      groupId,
      text: text.trim(),
    }).catch(() => {});

    return res.status(201).json({ message: populatedMessage });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create message",
      error: error.message,
    });
  }
};

exports.createAudioMessage = async (req, res) => {
  try {
    const senderId = req.user.userId;
    const { receiverId, groupId, duration = 0 } = req.body;
    const audioFile = req.file;

    if (!audioFile) {
      return res.status(400).json({ message: "Audio file is required" });
    }

    if (!receiverId && !groupId) {
      return res.status(400).json({ message: "receiverId or groupId is required" });
    }

    if (receiverId && !mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: "Invalid receiverId" });
    }

    if (groupId && !mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid groupId" });
    }

    const parsedDuration = Math.min(Math.max(Number(duration) || 0, 0), 120);

    if (groupId) {
    const group = await Group.findById(groupId).select("members admin");
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
    normalizeGroupMembers(group);
    if (!isGroupMember(group, senderId)) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }
    }

    const filePath = String(audioFile.path || "").replace(/\\/g, "/");
    const relativeUploadPath = filePath.includes("/uploads/")
      ? filePath.slice(filePath.indexOf("/uploads/"))
      : `/uploads/audio/${audioFile.filename}`;
    const audioUrl = `${req.protocol}://${req.get("host")}${relativeUploadPath}`;

    const message = await Message.create({
      senderId,
      receiverId: receiverId || null,
      groupId: groupId || null,
      type: "audio",
      audioUrl,
      duration: parsedDuration,
      text: "",
      image: "",
      translatedText: "",
      translatedLanguage: "",
      status: "sent",
    });

    let populatedMessage = await Message.findById(message._id).populate("senderId", "name profilePic email");
    const io = getSocketServer();

    if (io) {
      if (groupId) {
        const group = await Group.findById(groupId).select("members admin").lean();
        const memberIds = getGroupMemberIds(group);
        if (memberIds.length) {
          memberIds.forEach((memberId) => {
            const socketId = getUserSocket(memberId);
            if (!socketId) return;

            const payload = populatedMessage.toObject();
            if (String(memberId) === String(senderId)) {
              io.to(socketId).emit("messageSent", payload);
            } else {
              io.to(socketId).emit("receiveMessage", payload);
            }
            io.to(socketId).emit("newMessage", payload);
          });
        }
      } else {
        const receiverSocketId = getUserSocket(receiverId);
        if (receiverSocketId) {
          populatedMessage = await Message.findByIdAndUpdate(
            message._id,
            { status: "delivered" },
            { new: true }
          ).populate("senderId", "name profilePic email");

          const receiverPayload = populatedMessage.toObject();
          io.to(receiverSocketId).emit("receiveMessage", receiverPayload);
          io.to(receiverSocketId).emit("newMessage", receiverPayload);
        }

        const senderSocketId = getUserSocket(senderId);
        if (senderSocketId) {
          const senderPayload = populatedMessage.toObject();
          io.to(senderSocketId).emit("messageSent", senderPayload);
          io.to(senderSocketId).emit("newMessage", senderPayload);
        }
      }
    }

    return res.status(201).json({ message: populatedMessage });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create audio message",
      error: error.message,
    });
  }
};

exports.markReadMessages = async (req, res) => {
  try {
    const currentUserId = String(req.user.userId);
    const { chatId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: "Invalid chat id" });
    }

    const unreadMessages = await Message.find({
      groupId: null,
      senderId: chatId,
      receiverId: currentUserId,
      status: { $ne: "read" },
    })
      .select("_id senderId receiverId")
      .lean();

    if (!unreadMessages.length) {
      return res.status(200).json({
        message: "No unread messages",
        messageIds: [],
        lastSeenAt: new Date().toISOString(),
      });
    }

    const messageIds = unreadMessages.map((msg) => msg._id);

    await Message.updateMany(
      { _id: { $in: messageIds } },
      { $set: { status: "read" } }
    );

    const io = getSocketServer();
    if (io) {
      io.to(String(chatId)).emit("messageRead", {
        chatId: currentUserId,
        peerId: String(chatId),
        readerId: currentUserId,
        messageIds: messageIds.map((id) => String(id)),
      });
    }

    return res.status(200).json({
      message: "Messages marked as read",
      chatId: currentUserId,
      peerId: String(chatId),
      messageIds: messageIds.map((id) => String(id)),
      lastSeenAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to mark messages as read",
      error: error.message,
    });
  }
};

exports.reactToMessage = async (req, res) => {
  try {
    const currentUserId = String(req.user.userId);
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: "Invalid message id" });
    }

    const normalizedEmoji = String(emoji || "").trim();
    if (!normalizedEmoji) {
      return res.status(400).json({ message: "Emoji is required" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const hasAccess =
      String(message.senderId) === currentUserId ||
      String(message.receiverId) === currentUserId ||
      (message.groupId &&
        (await Group.exists({
          _id: message.groupId,
          $or: [{ "members.user": currentUserId }, { members: { $in: [currentUserId] } }],
        })));

    if (!hasAccess) {
      return res.status(403).json({ message: "Not authorized to react on this message" });
    }

    const reactionIndex = message.reactions.findIndex(
      (reaction) => String(reaction.userId) === currentUserId
    );

    if (reactionIndex >= 0) {
      message.reactions[reactionIndex].emoji = normalizedEmoji;
    } else {
      message.reactions.push({ userId: currentUserId, emoji: normalizedEmoji });
    }

    await message.save();

    const updatedMessage = await Message.findById(message._id).populate("senderId", "name profilePic email");

    const io = getSocketServer();
    if (io) {
      if (message.groupId) {
        const group = await Group.findById(message.groupId).select("members admin").lean();
        const memberIds = getGroupMemberIds(group);
        memberIds.forEach((memberId) => {
          const socketId = getUserSocket(memberId);
          if (socketId) {
            io.to(socketId).emit("reactionUpdated", updatedMessage);
          }
        });
      } else {
        const participantIds = [String(message.senderId), String(message.receiverId)].filter(Boolean);
        participantIds.forEach((participantId) => {
          const socketId = getUserSocket(participantId);
          if (socketId) {
            io.to(socketId).emit("reactionUpdated", updatedMessage);
          }
        });
      }
    }

    return res.status(200).json({ message: updatedMessage });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to react to message",
      error: error.message,
    });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const currentUserId = String(req.user.userId);
    const { messageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: "Invalid message id" });
    }

    const message = await Message.findById(messageId).lean();
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (String(message.senderId) !== currentUserId) {
      return res.status(403).json({ message: "Only sender can delete this message" });
    }

    await Message.findByIdAndDelete(messageId);

    const io = getSocketServer();
    if (io) {
      if (message.groupId) {
        const group = await Group.findById(message.groupId).select("members admin").lean();
        const memberIds = getGroupMemberIds(group);
        if (memberIds.length) {
          memberIds.forEach((memberId) => {
            const socketId = getUserSocket(memberId);
            if (socketId) {
              io.to(socketId).emit("messageDeleted", {
                messageId: String(messageId),
                groupId: String(message.groupId),
              });
            }
          });
        }
      } else {
        const participantIds = [String(message.senderId), String(message.receiverId)].filter(Boolean);
        participantIds.forEach((participantId) => {
          const socketId = getUserSocket(participantId);
          if (socketId) {
            io.to(socketId).emit("messageDeleted", {
              messageId: String(messageId),
              senderId: String(message.senderId),
              receiverId: String(message.receiverId),
            });
          }
        });
      }
    }

    return res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete message",
      error: error.message,
    });
  }
};
