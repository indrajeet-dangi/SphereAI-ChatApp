const mongoose = require("mongoose");
const Message = require("../models/Message");
const { getSocketServer, getUserSocket } = require("../utils/socketState");

exports.deleteChat = async (req, res) => {
  try {
    const currentUserId = String(req.user.userId);
    const { chatId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: "Invalid chat id" });
    }

    if (String(chatId) === currentUserId) {
      return res.status(400).json({ message: "Invalid chat target" });
    }

    const conversationExists = await Message.exists({
      groupId: null,
      $or: [
        { senderId: currentUserId, receiverId: chatId },
        { senderId: chatId, receiverId: currentUserId },
      ],
    });

    if (!conversationExists) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const updateResult = await Message.updateMany(
      {
        groupId: null,
        $or: [
          { senderId: currentUserId, receiverId: chatId },
          { senderId: chatId, receiverId: currentUserId },
        ],
      },
      {
        $addToSet: { deletedFor: currentUserId },
      }
    );

    const io = getSocketServer();
    if (io) {
      const socketId = getUserSocket(currentUserId);
      if (socketId) {
        io.to(socketId).emit("chatDeleted", {
          chatId: String(chatId),
        });
      }
    }

    return res.status(200).json({
      message: "Chat deleted successfully",
      modifiedCount: updateResult.modifiedCount || 0,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete chat",
      error: error.message,
    });
  }
};

