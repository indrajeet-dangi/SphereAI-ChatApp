const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const path = require("path");
const { createServer } = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Message = require("./models/Message");
const Group = require("./models/Group");
const User = require("./models/User");
require("./models/Task");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const chatRoutes = require("./routes/chatRoutes");
const groupRoutes = require("./routes/groupRoutes");
const aiRoutes = require("./routes/aiRoutes");
const taskRoutes = require("./routes/taskRoutes");
const { normalizeLanguage, translateMessageStrict } = require("./utils/translation");
const {
  setSocketServer,
  setUserSocket,
  removeUserSocket,
  getUserSocket,
  getOnlineUserIds,
} = require("./utils/socketState");
const { createTaskForMessage } = require("./services/taskService");
const { getGroupMemberIds, isGroupMember, normalizeGroupMembers } = require("./utils/groupMembers");

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;


const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173" )
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.status(200).json({ message: "Auth API running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/tasks", taskRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Something went wrong" });
});

const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in environment variables");
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing in environment variables");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    const io = new Server(httpServer, {
      cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
      },
    });

    io.use((socket, next) => {
      try {
        const tokenFromAuth = socket.handshake?.auth?.token;
        const tokenFromHeader = String(socket.handshake?.headers?.authorization || "").startsWith("Bearer ")
          ? String(socket.handshake.headers.authorization).split(" ")[1]
          : "";
        const token = tokenFromAuth || tokenFromHeader;

        if (!token) {
          return next(new Error("Unauthorized"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded?.userId) {
          return next(new Error("Unauthorized"));
        }

        socket.user = decoded;
        socket.userId = String(decoded.userId);
        return next();
      } catch (error) {
        return next(new Error("Unauthorized"));
      }
    });

    setSocketServer(io);

    io.on("connection", (socket) => {
      socket.join(String(socket.userId));
      setUserSocket(String(socket.userId), socket.id);
      io.emit("onlineUsers", getOnlineUserIds());

      socket.on("join", () => {
        if (!socket.userId) return;
        socket.join(String(socket.userId));
        setUserSocket(String(socket.userId), socket.id);
        io.emit("onlineUsers", getOnlineUserIds());
      });

      socket.on("userOnline", () => {
        if (!socket.userId) return;
        socket.join(String(socket.userId));
        setUserSocket(String(socket.userId), socket.id);
        io.emit("onlineUsers", getOnlineUserIds());
      });

      socket.on("joinChat", ({ chatId }) => {
        if (!chatId) return;
        socket.join(String(chatId));
      });

      socket.on("leaveChat", ({ chatId }) => {
        if (!chatId) return;
        socket.leave(String(chatId));
      });

      socket.on("typing", ({ chatId, userId, userName }) => {
        if (!chatId || !userId || !userName) return;
        socket.to(String(chatId)).emit("userTyping", {
          chatId: String(chatId),
          userId: String(userId),
          userName: String(userName),
        });
      });

      socket.on("stopTyping", ({ chatId, userId }) => {
        if (!chatId || !userId) return;
        socket.to(String(chatId)).emit("userStopTyping", {
          chatId: String(chatId),
          userId: String(userId),
        });
      });

      socket.on("sendMessage", async (payload) => {
        try {
          const senderId = socket.userId;
          const { receiverId, groupId, text = "", image = "" } = payload || {};

          if (!senderId || (!receiverId && !groupId) || (!text.trim() && !image.trim())) return;

          let message;
          if (groupId) {
            const group = await Group.findById(groupId).select("members admin");
            if (!group) {
              socket.emit("messageError", "Group not found");
              return;
            }

            normalizeGroupMembers(group);
            if (!isGroupMember(group, senderId)) {
              socket.emit("messageError", "Not authorized for this group");
              return;
            }

            const created = await Message.create({
              senderId,
              groupId,
              type: image.trim() ? "image" : "text",
              text: text.trim(),
              image: image.trim(),
            });
            message = await Message.findById(created._id).populate("senderId", "name profilePic email");

            getGroupMemberIds(group).forEach((memberId) => {
              const memberKey = String(memberId);
              const memberSocketId = getUserSocket(memberKey);
              if (memberSocketId && memberKey !== String(senderId)) {
                io.to(memberSocketId).emit("receiveMessage", message);
              }
            });
          } else {
            let translatedText = "";
            let translatedLanguage = "";

            if (text.trim()) {
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

            const created = await Message.create({
              senderId,
              receiverId,
              type: image.trim() ? "image" : "text",
              text: text.trim(),
              image: image.trim(),
              status: "sent",
              translatedText,
              translatedLanguage,
            });
            message = await Message.findById(created._id).populate("senderId", "name profilePic email");

            const receiverSocketId = getUserSocket(receiverId);
            if (receiverSocketId) {
              message = await Message.findByIdAndUpdate(
                created._id,
                { status: "delivered" },
                { new: true }
              ).populate("senderId", "name profilePic email");

              const receiverMessage = message.toObject();
              if (receiverMessage.translatedText && receiverMessage.translatedLanguage) {
                receiverMessage.text = receiverMessage.translatedText;
              }
              io.to(receiverSocketId).emit("receiveMessage", receiverMessage);

              socket.emit("messageDelivered", {
                messageId: String(message._id),
                senderId: String(message.senderId?._id || message.senderId),
                receiverId: String(receiverId),
                status: "delivered",
              });
            }
          }

          socket.emit("messageSent", message);

          createTaskForMessage({
            senderId,
            receiverId,
            groupId,
            text: text.trim(),
          }).catch(() => {});
        } catch (error) {
          socket.emit("messageError", "Failed to send message");
        }
      });

      socket.on("disconnect", () => {
        if (socket.userId) {
          removeUserSocket(socket.userId);
          io.emit("onlineUsers", getOnlineUserIds());
        }
      });
    });

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
