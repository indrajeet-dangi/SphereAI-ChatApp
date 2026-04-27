import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import UsersListPanel from "../components/chat/UsersListPanel";
import ChatWindowPanel from "../components/chat/ChatWindowPanel";
import InfoPanel from "../components/chat/InfoPanel";
import NewChatModal from "../components/chat/NewChatModal";
import ConfirmModal from "../components/chat/ConfirmModal";
import EmptyState from "../components/chat/EmptyState";
import {
  addGroupMembers,
  analyzeMessage,
  chatWithAI,
  correctGrammar,
  createAIChat,
  createGroup,
  createAudioMessage,
  deleteChat,
  deleteMessage,
  completeTask,
  deleteGroup,
  deleteTask,
  exitGroup,
  fetchReplySuggestions,
  fetchAIChat,
  createMessage,
  fetchConversation,
  fetchConversations,
  fetchGroupMessages,
  fetchGroupSummary,
  generateGroupSummary,
  fetchGroups,
  fetchMe,
  fetchTasks,
  fetchUsers,
  logoutUser,
  makeGroupAdmin,
  markMessagesRead,
  markGroupSeen,
  reactToMessage,
  removeGroupMember,
  updateGroupDescription,
  updatePreferences,
} from "../services/api";
import { connectSocket, disconnectSocket, getSocket } from "../services/socket";
import { useUserContext } from "../context/UserContext";
import { t } from "../i18n";
import { AI_USER } from "../constants/aiUser";

const normalizeUserChat = (user) => ({
  ...user,
  id: user._id,
  type: "user",
  isGroup: false,
  isAI: false,
  chatKey: `user:${user._id}`,
});

const normalizeGroupChat = (group) => ({
  ...group,
  id: group._id,
  type: "group",
  isGroup: true,
  isAI: false,
  chatKey: `group:${group._id}`,
  name: group.name,
  profilePic: group.groupPic || "",
});

const normalizeAIChat = (chat = {}) => ({
  ...AI_USER,
  ...chat,
  _id: AI_USER._id,
  id: AI_USER.id,
  type: "ai",
  isAI: true,
  isGroup: false,
  chatKey: AI_USER.chatKey,
  name: AI_USER.name,
  profilePic: AI_USER.profilePic,
  avatar: AI_USER.avatar,
  bio: AI_USER.bio,
  forceOnline: true,
});

const getSenderId = (sender) => (typeof sender === "object" ? sender?._id : sender);
const getMessagePreviewText = (message) => {
  if (!message) return "";
  if (message.text) return message.text;
  if (message.image) return "[image]";
  if (message.audioUrl || message.type === "audio") return "[audio]";
  return "";
};

const AI_GREETING_TEXT = `Welcome to ${AI_USER.name}. I'm here to help you with anything. Ask me anything!`;

const buildAIWelcomeMessage = () => ({
  _id: `local-ai-welcome-${Date.now()}`,
  senderId: AI_USER._id,
  text: AI_GREETING_TEXT,
  image: "",
  createdAt: new Date().toISOString(),
  isSystem: true,
});

const mapPersistedAIMessage = (message = {}) => ({
  _id: String(message._id || `ai-msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
  senderId: String(message.sender || "") === "user" ? "user" : AI_USER._id,
  text: String(message.text || "").trim(),
  image: "",
  createdAt: message.createdAt ? new Date(message.createdAt).toISOString() : new Date().toISOString(),
  isSystem: true,
});

const normalizeAIMessages = (messages = []) =>
  Array.isArray(messages) ? messages.map(mapPersistedAIMessage).filter((msg) => msg.text) : [];

const ensureWelcomeMessage = (messages = []) => {
  const hasGreeting = messages.some(
    (message) =>
      String(getSenderId(message.senderId || message.sender)) === String(AI_USER._id)
  );
  if (hasGreeting) return messages;
  return [buildAIWelcomeMessage(), ...messages];
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth0();
  const { currentUser, setCurrentUser, language } = useUserContext();

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [isAIChat, setIsAIChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [aiMessages, setAiMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [lastMessageMap, setLastMessageMap] = useState({});
  const [lastMessageTimeMap, setLastMessageTimeMap] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastSeenMap, setLastSeenMap] = useState({});
  const [openedUnreadCount, setOpenedUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [supportPopup, setSupportPopup] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingGroupSummary, setLoadingGroupSummary] = useState(false);
  const [groupSummary, setGroupSummary] = useState({ unreadCount: 0, summary: "" });
  const [loadingCurrentUser, setLoadingCurrentUser] = useState(true);
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);
  const [managingGroup, setManagingGroup] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") === "dark");
  const [confirmAction, setConfirmAction] = useState(null);
  const [deletingAction, setDeletingAction] = useState(false);

  const messagesEndRef = useRef(null);
  const selectedChatRef = useRef(null);
  const lastSuggestedMessageRef = useRef("");
  const lastSupportPopupAtRef = useRef(0);
  const lastSupportPopupKeyRef = useRef("");
  const typingTimeoutRef = useRef(null);
  const typingCleanupTimersRef = useRef({});
  const activeTypingChatIdRef = useRef("");
  const grammarDebounceRef = useRef(null);
  const lastGrammarRequestRef = useRef("");
  const messageInputRef = useRef("");
  const SUPPORT_COOLDOWN_MS = 15000;

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    selectedChatRef.current = selectedChat?.chatKey || null;
  }, [selectedChat]);

  useEffect(() => {
    messageInputRef.current = messageInput;
  }, [messageInput]);

  useEffect(() => {
    const socket = getSocket();
    const nextChatId = getChatRoomId(selectedChat);
    const previousChatId = activeTypingChatIdRef.current;

    if (socket?.connected && previousChatId && previousChatId !== nextChatId) {
      socket.emit("leaveChat", { chatId: previousChatId });
      socket.emit("stopTyping", {
        chatId: previousChatId,
        userId: currentUser?._id,
      });
    }

    clearTypingState();

    if (socket?.connected && nextChatId) {
      socket.emit("joinChat", { chatId: nextChatId });
    }

    activeTypingChatIdRef.current = nextChatId;

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [selectedChat?.chatKey, currentUser?._id]);

  useEffect(() => {
    lastSuggestedMessageRef.current = "";
    setSuggestions([]);
  }, [selectedChat?.chatKey]);

  useEffect(() => {
    setSupportPopup(null);
  }, [selectedChat?.chatKey]);

  useEffect(() => {
    if (!supportPopup) return undefined;
    const timer = setTimeout(() => {
      setSupportPopup(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [supportPopup]);

  useEffect(() => {
    return () => {
      if (grammarDebounceRef.current) {
        clearTimeout(grammarDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const upsertChat = (chat) => {
    setChats((prev) => {
      const exists = prev.some((item) => item.chatKey === chat.chatKey);
      if (exists) return prev;
      return [chat, ...prev];
    });
  };

  const moveChatToTop = (chatKey) => {
    setChats((prev) => {
      const target = prev.find((chat) => chat.chatKey === chatKey);
      if (!target) return prev;
      return [target, ...prev.filter((chat) => chat.chatKey !== chatKey)];
    });
  };

  const updateChatPreviewFromMessages = (chatKey, nextMessages) => {
    if (!chatKey) return;
    const lastMsg = (nextMessages || [])[nextMessages.length - 1];

    setLastMessageMap((prev) => {
      if (lastMsg) {
        return {
          ...prev,
          [chatKey]: getMessagePreviewText(lastMsg),
        };
      }
      const updated = { ...prev };
      delete updated[chatKey];
      return updated;
    });

    setLastMessageTimeMap((prev) => {
      if (lastMsg) {
        return {
          ...prev,
          [chatKey]: lastMsg.createdAt || new Date().toISOString(),
        };
      }
      const updated = { ...prev };
      delete updated[chatKey];
      return updated;
    });
  };

  const getChatRoomId = (chat = selectedChat) => {
    if (!chat || !currentUser?._id) return "";
    if (chat.type === "group") return `group:${chat._id}`;
    if (chat.type === "user") {
      const ids = [String(currentUser._id), String(chat._id)].sort();
      return `dm:${ids[0]}:${ids[1]}`;
    }
    return "";
  };

  const clearTypingState = () => {
    setTypingUsers([]);
    Object.values(typingCleanupTimersRef.current).forEach((timer) => clearTimeout(timer));
    typingCleanupTimersRef.current = {};
  };

  const emitStopTyping = (chat = selectedChat) => {
    const socket = getSocket();
    if (!socket?.connected || !currentUser?._id) return;
    const chatId = getChatRoomId(chat);
    if (!chatId) return;
    socket.emit("stopTyping", {
      chatId,
      userId: currentUser._id,
    });
  };

  const updateMessageStatuses = (messageIds, status) => {
    if (!Array.isArray(messageIds) || messageIds.length === 0) return;
    const ids = new Set(messageIds.map((id) => String(id)));
    setMessages((prev) =>
      prev.map((msg) => (ids.has(String(msg._id)) ? { ...msg, status } : msg))
    );
  };

  const markPersonalChatAsRead = async (chat) => {
    if (!chat || chat.type !== "user") return;
    try {
      const data = await markMessagesRead(chat._id);
      console.log("mark-read response:", data);
      updateMessageStatuses(data?.messageIds || [], "read");
      setLastSeenMap((prev) => ({
        ...prev,
        [chat.chatKey]: data?.lastSeenAt || new Date().toISOString(),
      }));
    } catch {
      // Avoid interrupting chat open flow if mark-read fails.
    }
  };

  const loadSidebarChats = async () => {
    try {
      setLoadingUsers(true);
      const [conversationsResult, groupsResult] = await Promise.allSettled([
        fetchConversations(),
        fetchGroups(),
      ]);

      const conversationsData =
        conversationsResult.status === "fulfilled" ? conversationsResult.value : { users: [] };
      const groupsData =
        groupsResult.status === "fulfilled" ? groupsResult.value : { groups: [] };

      const conversationChats = (conversationsData.users || []).map(normalizeUserChat);
      const groupChats = (groupsData.groups || []).map(normalizeGroupChat);
      const next = [normalizeAIChat(AI_USER), ...groupChats, ...conversationChats];
      setChats(next);

      if (groupsResult.status === "rejected") {
        setError(groupsResult.reason?.response?.data?.message || "Failed to fetch groups");
      } else if (conversationsResult.status === "rejected") {
        setError(conversationsResult.reason?.response?.data?.message || "Failed to fetch users");
      } else {
        setError("");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch chats");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const meData = await fetchMe();
        const user = meData.user;
        setCurrentUser(user);

        const nextDarkMode = Boolean(user?.darkMode);
        setDarkMode(nextDarkMode);
        if (nextDarkMode) {
          document.documentElement.classList.add("dark");
          localStorage.setItem("theme", "dark");
        } else {
          document.documentElement.classList.remove("dark");
          localStorage.setItem("theme", "light");
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load profile");
      } finally {
        setLoadingCurrentUser(false);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (!currentUser?._id) return;
    loadSidebarChats();
    ensureAllUsersLoaded();

    const loadTasks = async () => {
      try {
        const data = await fetchTasks();
        setTasks((data.tasks || []).filter((task) => !task.completed));
      } catch {
        setTasks([]);
      }
    };

    loadTasks();
  }, [currentUser?._id]);

  useEffect(() => {
    if (!selectedChat?.chatKey) {
      setMessages([]);
      setGroupSummary({ unreadCount: 0, summary: "" });
      return;
    }

    if (selectedChat.type === "ai") {
      setMessages(aiMessages);
      setLoadingMessages(false);
      setGroupSummary({ unreadCount: 0, summary: "" });
      return;
    }

    const loadMessages = async () => {
      try {
        setLoadingMessages(true);
        const data =
          selectedChat.type === "group"
            ? await fetchGroupMessages(selectedChat._id)
            : await fetchConversation(selectedChat._id);

        const loadedMessages = data.messages || [];
        setMessages(loadedMessages);

        const lastMessage = loadedMessages[loadedMessages.length - 1];
        if (lastMessage) {
          setLastMessageMap((prev) => ({
            ...prev,
            [selectedChat.chatKey]: lastMessage.text || (lastMessage.image ? "[image]" : ""),
          }));
          setLastMessageTimeMap((prev) => ({
            ...prev,
            [selectedChat.chatKey]: lastMessage.createdAt || new Date().toISOString(),
          }));
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to fetch messages");
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [selectedChat?.chatKey, aiMessages]);

  useEffect(() => {
    if (!selectedChat || selectedChat.type !== "user") return;
    markPersonalChatAsRead(selectedChat);
  }, [selectedChat?._id, selectedChat?.type]);

  useEffect(() => {
    if (!selectedChat?._id || selectedChat.type !== "group") {
      setGroupSummary({ unreadCount: 0, summary: "" });
      return;
    }

    const loadGroupSummary = async () => {
      try {
        setLoadingGroupSummary(true);
        await generateGroupSummary(selectedChat._id);
        const data = await fetchGroupSummary(selectedChat._id);
        setGroupSummary({
          unreadCount: Number(data.unreadCount || 0),
          summary: data.summary || "",
        });
      } catch {
        setGroupSummary({ unreadCount: 0, summary: "" });
      } finally {
        setLoadingGroupSummary(false);
      }
    };

    loadGroupSummary();
  }, [selectedChat?._id, selectedChat?.type]);

  useEffect(() => {
    if (!selectedChat?._id || selectedChat.type !== "group") return undefined;

    const timer = setTimeout(async () => {
      try {
        await markGroupSeen(selectedChat._id);
        setGroupSummary((prev) => ({ ...prev, unreadCount: 0 }));
      } catch {
        // No-op: seen tracking retry can happen on next open.
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [selectedChat?._id, selectedChat?.type]);

  useEffect(() => {
    if (!currentUser?._id) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = connectSocket();
    if (!socket) return;

    socket.emit("setup", currentUser);
    socket.emit("join");

    const onOnlineUsers = (ids) => {
      setOnlineUsers(Array.isArray(ids) ? ids : []);
    };

    const onReceiveMessage = (msg) => {
      const senderId = getSenderId(msg.senderId);
      const chatKey = msg.groupId ? `group:${msg.groupId}` : `user:${senderId}`;
      const isActive = chatKey === selectedChatRef.current;

      if (isActive) {
        setMessages((prev) => {
          const incomingId = String(msg?._id || "");
          if (incomingId && prev.some((item) => String(item?._id) === incomingId)) return prev;
          return [...prev, msg];
        });
      } else {
        setUnreadCounts((prev) => ({
          ...prev,
          [chatKey]: (prev[chatKey] || 0) + 1,
        }));
      }

      setLastMessageMap((prev) => ({
        ...prev,
        [chatKey]: getMessagePreviewText(msg),
      }));

      setLastMessageTimeMap((prev) => ({
        ...prev,
        [chatKey]: msg.createdAt || new Date().toISOString(),
      }));

      moveChatToTop(chatKey);
      loadSidebarChats();
    };

    const onMessageSent = (msg) => {
      const chatKey = msg.groupId ? `group:${msg.groupId}` : `user:${msg.receiverId}`;

      if (chatKey === selectedChatRef.current) {
        setMessages((prev) => {
          const sentId = String(msg?._id || "");
          if (sentId && prev.some((item) => String(item?._id) === sentId)) return prev;
          return [...prev, msg];
        });
      }

      setLastMessageMap((prev) => ({
        ...prev,
        [chatKey]: getMessagePreviewText(msg),
      }));

      setLastMessageTimeMap((prev) => ({
        ...prev,
        [chatKey]: msg.createdAt || new Date().toISOString(),
      }));

      moveChatToTop(chatKey);
      loadSidebarChats();
    };

    const onMessageError = (message) => {
      setError(message || "Failed to send message");
    };

    const onMessageDeleted = (payload) => {
      const deletedMessageId = String(payload?.messageId || "");
      if (!deletedMessageId) return;

      setMessages((prev) => {
        const next = prev.filter((msg) => String(msg._id) !== deletedMessageId);
        if (selectedChatRef.current) {
          updateChatPreviewFromMessages(selectedChatRef.current, next);
        }
        return next;
      });

      loadSidebarChats();
    };

    const onReactionUpdated = (updatedMessage) => {
      if (!updatedMessage?._id) return;
      const updatedMessageId = String(updatedMessage._id);
      setMessages((prev) =>
        prev.map((msg) => (String(msg._id) === updatedMessageId ? { ...msg, ...updatedMessage } : msg))
      );
    };

    const onMessageDelivered = (payload) => {
      const deliveredId = String(payload?.messageId || "");
      if (!deliveredId) return;
      setMessages((prev) =>
        prev.map((msg) =>
          String(msg._id) === deliveredId
            ? { ...msg, status: payload?.status || "delivered" }
            : msg
        )
      );
    };

    const onMessageRead = (payload) => {
      console.log("messageRead event:", payload);
      const ids = Array.isArray(payload?.messageIds)
        ? payload.messageIds.map((id) => String(id))
        : [];
      if (ids.length > 0) {
        updateMessageStatuses(ids, "read");
        return;
      }

      const readChatId = String(payload?.chatId || "");
      if (!readChatId) return;
      setMessages((prev) =>
        prev.map((msg) =>
          String(msg?.receiverId?._id || msg?.receiverId) === readChatId
            ? { ...msg, status: "read" }
            : msg
        )
      );
    };

    const onChatDeleted = ({ chatId }) => {
      const key = `user:${chatId}`;
      setChats((prev) => prev.filter((chat) => chat.chatKey !== key));
      setSelectedChat((prev) => (prev?.chatKey === key ? null : prev));
      if (selectedChatRef.current === key) {
        setMessages([]);
      }
    };

    const onGroupDeleted = ({ groupId }) => {
      const key = `group:${groupId}`;
      setChats((prev) => prev.filter((chat) => chat.chatKey !== key));
      setSelectedChat((prev) => (prev?.chatKey === key ? null : prev));
      if (selectedChatRef.current === key) {
        setMessages([]);
      }
    };

    const onTaskCreated = (task) => {
      if (!task || task.completed) return;
      setTasks((prev) => {
        if (prev.some((item) => item._id === task._id)) return prev;
        return [task, ...prev];
      });
    };

    const onTaskCompleted = ({ taskId }) => {
      setTasks((prev) => prev.filter((task) => task._id !== taskId));
    };

    const onTaskDeleted = ({ taskId }) => {
      setTasks((prev) => prev.filter((task) => task._id !== taskId));
    };

    const onConnectError = (err) => {
      if (String(err?.message || "").toLowerCase().includes("unauthorized")) {
        localStorage.removeItem("token");
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      }
    };

    const onUserTyping = ({ chatId, userId, userName }) => {
      if (!chatId || !userId || !userName) return;
      if (String(userId) === String(currentUser?._id)) return;
      if (chatId !== activeTypingChatIdRef.current) return;

      setTypingUsers((prev) => {
        if (prev.some((user) => String(user.userId) === String(userId))) return prev;
        return [...prev, { userId: String(userId), userName: String(userName) }];
      });

      if (typingCleanupTimersRef.current[userId]) {
        clearTimeout(typingCleanupTimersRef.current[userId]);
      }
      typingCleanupTimersRef.current[userId] = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((user) => String(user.userId) !== String(userId)));
        delete typingCleanupTimersRef.current[userId];
      }, 3000);
    };

    const onUserStopTyping = ({ chatId, userId }) => {
      if (!chatId || !userId) return;
      if (chatId !== activeTypingChatIdRef.current) return;
      setTypingUsers((prev) => prev.filter((user) => String(user.userId) !== String(userId)));
      if (typingCleanupTimersRef.current[userId]) {
        clearTimeout(typingCleanupTimersRef.current[userId]);
        delete typingCleanupTimersRef.current[userId];
      }
    };

    socket.on("onlineUsers", onOnlineUsers);
    socket.on("online users", onOnlineUsers);
    socket.on("receiveMessage", onReceiveMessage);
    socket.on("message received", onReceiveMessage);
    socket.on("messageSent", onMessageSent);
    socket.on("messageError", onMessageError);
    socket.on("messageDeleted", onMessageDeleted);
    socket.on("reactionUpdated", onReactionUpdated);
    socket.on("messageDelivered", onMessageDelivered);
    socket.on("messageRead", onMessageRead);
    socket.on("chatDeleted", onChatDeleted);
    socket.on("groupDeleted", onGroupDeleted);
    socket.on("taskCreated", onTaskCreated);
    socket.on("taskCompleted", onTaskCompleted);
    socket.on("taskDeleted", onTaskDeleted);
    socket.on("connect_error", onConnectError);
    socket.on("userTyping", onUserTyping);
    socket.on("userStopTyping", onUserStopTyping);

    return () => {
      socket.off("onlineUsers", onOnlineUsers);
      socket.off("online users", onOnlineUsers);
      socket.off("receiveMessage", onReceiveMessage);
      socket.off("message received", onReceiveMessage);
      socket.off("messageSent", onMessageSent);
      socket.off("messageError", onMessageError);
      socket.off("messageDeleted", onMessageDeleted);
      socket.off("reactionUpdated", onReactionUpdated);
      socket.off("messageDelivered", onMessageDelivered);
      socket.off("messageRead", onMessageRead);
      socket.off("chatDeleted", onChatDeleted);
      socket.off("groupDeleted", onGroupDeleted);
      socket.off("taskCreated", onTaskCreated);
      socket.off("taskCompleted", onTaskCompleted);
      socket.off("taskDeleted", onTaskDeleted);
      socket.off("connect_error", onConnectError);
      socket.off("userTyping", onUserTyping);
      socket.off("userStopTyping", onUserStopTyping);
      disconnectSocket();
    };
  }, [currentUser?._id]);

  useEffect(() => {
    if (!selectedChat?.chatKey || selectedChat.type === "ai" || !currentUser?._id) return;
    if (!Array.isArray(messages) || messages.length === 0) return;

    const latestIncoming = [...messages]
      .reverse()
      .find((msg) => {
        const senderId = getSenderId(msg.senderId);
        return String(senderId) !== String(currentUser._id) && String(msg.text || "").trim();
      });

    if (!latestIncoming) return;

    const messageId =
      latestIncoming._id ||
      `${latestIncoming.createdAt || ""}-${latestIncoming.text || ""}`;
    const sourceKey = `${selectedChat.chatKey}:${messageId}`;

    if (lastSuggestedMessageRef.current === sourceKey) return;
    lastSuggestedMessageRef.current = sourceKey;

    let cancelled = false;
    const loadSuggestions = async () => {
      try {
        const data = await fetchReplySuggestions({ message: latestIncoming.text });
        if (cancelled) return;
        setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions.slice(0, 3) : []);
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    };

    loadSuggestions();
    return () => {
      cancelled = true;
    };
  }, [messages, selectedChat?.chatKey, selectedChat?.type, currentUser?._id]);

  useEffect(() => {
    return () => {
      if (selectedImagePreview) {
        URL.revokeObjectURL(selectedImagePreview);
      }
    };
  }, [selectedImagePreview]);

  const handleSelectChat = (chat) => {
    if (chat.type === "ai") {
      const aiChat = normalizeAIChat(chat);
      const nextAiMessages = ensureWelcomeMessage(aiMessages);
      setAiMessages(nextAiMessages);
      const latestMessage = nextAiMessages[nextAiMessages.length - 1];
      if (latestMessage) {
        setLastMessageMap((prev) => ({
          ...prev,
          [AI_USER.chatKey]: latestMessage.text,
        }));
        setLastMessageTimeMap((prev) => ({
          ...prev,
          [AI_USER.chatKey]: latestMessage.createdAt,
        }));
      }

      setOpenedUnreadCount(0);
      setShowInfoPanel(false);
      setIsAIChat(true);
      setSelectedChat(aiChat);
      setMessages(nextAiMessages);
      setMobileChatOpen(isMobileView);
      setUnreadCounts((prev) => ({ ...prev, [AI_USER.chatKey]: 0 }));
      setError("");
      setSuggestions([]);
      return;
    }

    const pendingUnread = unreadCounts[chat.chatKey] || 0;
    setOpenedUnreadCount(pendingUnread);
    setShowInfoPanel(false);
    setIsAIChat(false);
    setSelectedChat(chat);
    setMobileChatOpen(isMobileView);
    setUnreadCounts((prev) => ({ ...prev, [chat.chatKey]: 0 }));
    setError("");
    if (chat.type === "user") {
      markPersonalChatAsRead(chat);
    }
  };

  const handleImageFileChange = (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setSelectedImageFile(file);
    setSelectedImagePreview(previewUrl);
    setError("");
  };

  const clearSelectedImage = () => {
    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }
    setSelectedImageFile(null);
    setSelectedImagePreview("");
  };

  const uploadImageToCloudinary = async (file) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error("Cloudinary config is missing");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error("Image upload failed");
    }

    const data = await response.json();
    return data.secure_url || "";
  };

  const maybeShowSupportPopup = async (messageText, chatKey, messageId) => {
    const text = String(messageText || "").trim();
    if (!text) return;
    if (text.length < 8) return;

    const normalized = text.toLowerCase();
    const ignoredShortReplies = new Set(["ok", "yes", "hello"]);
    if (ignoredShortReplies.has(normalized)) return;

    try {
      const data = await analyzeMessage({ message: text });
      if (!(data?.response && data.type !== "normal" && Number(data.confidence) >= 0.6)) return;

      const now = Date.now();
      const popupKey = `${chatKey}:${messageId || text.toLowerCase()}`;
      if (lastSupportPopupKeyRef.current === popupKey) return;
      if (now - lastSupportPopupAtRef.current < SUPPORT_COOLDOWN_MS) return;

      lastSupportPopupKeyRef.current = popupKey;
      lastSupportPopupAtRef.current = now;
      setSupportPopup({
        id: `${now}`,
        type: data.type,
        emotion: data.emotion || "neutral",
        confidence: Number(data.confidence) || 0,
        response: data.response,
      });
    } catch {
      // Ignore analysis errors to avoid interrupting message flow.
    }
  };

  const handleMessageInputChange = (value) => {
    setMessageInput(value);

    const trimmed = String(value || "").trim();
    const chatId = getChatRoomId(selectedChat);
    const socket = getSocket();
    if (socket?.connected && currentUser?._id && selectedChat?._id && chatId) {
      if (!trimmed) {
        emitStopTyping(selectedChat);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
      } else {
        socket.emit("typing", {
          chatId,
          userId: currentUser._id,
          userName: currentUser.name || "User",
        });

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          emitStopTyping(selectedChat);
          typingTimeoutRef.current = null;
        }, 1500);
      }
    }

    const shouldRunGrammar =
      selectedChat?.type !== "ai" &&
      trimmed.length >= 8 &&
      trimmed !== lastGrammarRequestRef.current;

    if (grammarDebounceRef.current) {
      clearTimeout(grammarDebounceRef.current);
      grammarDebounceRef.current = null;
    }

    if (!shouldRunGrammar) return;

    const draft = trimmed;
    grammarDebounceRef.current = setTimeout(async () => {
      try {
        const data = await correctGrammar({ text: draft });
        const corrected = String(data?.correctedText || "").trim();
        if (!corrected || corrected === draft) return;
        if (String(messageInputRef.current || "").trim() !== draft) return;
        lastGrammarRequestRef.current = draft;
        setMessageInput(corrected);
      } catch {
        // Skip grammar update silently.
      }
    }, 650);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (grammarDebounceRef.current) {
      clearTimeout(grammarDebounceRef.current);
      grammarDebounceRef.current = null;
    }

    if (!selectedChat?._id || !currentUser?._id) return;

    const text = messageInput.trim();
    const hasImage = Boolean(selectedImageFile);

    if (!text && !hasImage) return;

    setError("");
    setSendingMessage(true);
    setSuggestions([]);

    try {
      emitStopTyping(selectedChat);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      if (selectedChat.type === "ai") {
        if (hasImage) {
          setError("Image is not supported in AI chat yet.");
          return;
        }

        const userMessage = {
          _id: `local-user-${Date.now()}`,
          senderId: currentUser._id,
          text,
          image: "",
          createdAt: new Date().toISOString(),
        };

        const withUserMessage = [...aiMessages, userMessage];
        setAiMessages(withUserMessage);
        setMessages(withUserMessage);
      upsertChat(normalizeAIChat(AI_USER));
        setLastMessageMap((prev) => ({
          ...prev,
          [AI_USER.chatKey]: userMessage.text,
        }));
        setLastMessageTimeMap((prev) => ({
          ...prev,
          [AI_USER.chatKey]: userMessage.createdAt,
        }));
        moveChatToTop(AI_USER.chatKey);
        setMessageInput("");

        const data = await chatWithAI({ message: text });
        const aiReplyMessage = {
          _id: `local-ai-${Date.now()}`,
          senderId: AI_USER._id,
          text: data.reply || "",
          image: "",
          createdAt: new Date().toISOString(),
        };

        const finalAiMessages = [...withUserMessage, aiReplyMessage];
        setAiMessages(finalAiMessages);
        setMessages(finalAiMessages);
        setLastMessageMap((prev) => ({
          ...prev,
          [AI_USER.chatKey]: aiReplyMessage.text || `${AI_USER.name} reply`,
        }));
        setLastMessageTimeMap((prev) => ({
          ...prev,
          [AI_USER.chatKey]: aiReplyMessage.createdAt || new Date().toISOString(),
        }));
        moveChatToTop(AI_USER.chatKey);
        return;
      }

      let image = "";
      if (selectedImageFile) {
        image = await uploadImageToCloudinary(selectedImageFile);
      }

      const payload = {
        senderId: currentUser._id,
        text,
        image,
        ...(selectedChat.type === "group"
          ? { groupId: selectedChat._id }
          : { receiverId: selectedChat._id }),
      };

      const socket = getSocket();

      if (socket?.connected) {
        const localMessageId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        socket.emit("sendMessage", payload);
        await maybeShowSupportPopup(text, selectedChat.chatKey, localMessageId);
      } else {
        const data = await createMessage(payload);
        const savedMessage = data.message;
        setMessages((prev) => [...prev, savedMessage]);
        setLastMessageMap((prev) => ({
          ...prev,
          [selectedChat.chatKey]: savedMessage.text || (savedMessage.image ? "[image]" : ""),
        }));
        setLastMessageTimeMap((prev) => ({
          ...prev,
          [selectedChat.chatKey]: savedMessage.createdAt || new Date().toISOString(),
        }));
        await maybeShowSupportPopup(text, selectedChat.chatKey, savedMessage?._id);
      }

      setMessageInput("");
      clearSelectedImage();
    } catch (err) {
      const apiMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to send message";

      if (selectedChat?.type === "ai") {
        const aiErrorMessage = {
          _id: `local-ai-error-${Date.now()}`,
          senderId: AI_USER._id,
          text: `AI error: ${apiMessage}`,
          image: "",
          createdAt: new Date().toISOString(),
        };
        setAiMessages((prev) => [...prev, aiErrorMessage]);
        setMessages((prev) => [...prev, aiErrorMessage]);
      } else {
        setError(apiMessage);
      }
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendAudioMessage = async (audioBlob, durationInSeconds) => {
    if (!selectedChat?._id || !currentUser?._id) return;
    if (selectedChat.type === "ai") {
      setError("Voice message is not supported in AI chat yet.");
      return;
    }

    setError("");

    const file = new File([audioBlob], `voice-${Date.now()}.webm`, {
      type: audioBlob.type || "audio/webm",
    });

    const formData = new FormData();
    formData.append("audio", file);
    formData.append("duration", String(Math.min(Number(durationInSeconds) || 0, 120)));
    if (selectedChat.type === "group") {
      formData.append("groupId", selectedChat._id);
    } else {
      formData.append("receiverId", selectedChat._id);
    }

    await createAudioMessage(formData);
    // Do not append locally here.
    // Backend emits socket events; local append + socket append causes duplicates.
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      // JWT logout is client-side; ignore API errors.
    }

    localStorage.removeItem("token");
    localStorage.removeItem("auth0_access_token");

    if (isAuthenticated) {
      logout({ logoutParams: { returnTo: window.location.origin } });
      return;
    }

    navigate("/login");
  };

  const handleOpenSettings = () => {
    navigate("/settings");
  };

  const handleToggleTheme = async () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);

    try {
      await updatePreferences({ darkMode: nextMode });
      setCurrentUser((prev) => (prev ? { ...prev, darkMode: nextMode } : prev));
    } catch {
      setDarkMode((prev) => !prev);
      setError("Failed to save theme preference");
    }
  };

  const handleOpenNewChat = async () => {
    try {
      setShowNewChatModal(true);
      setLoadingAllUsers(true);
      const data = await fetchUsers();
      setAllUsers(data.users || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch users");
    } finally {
      setLoadingAllUsers(false);
    }
  };

  const handleOpenAIChat = () => {
    const nextAiMessages = ensureWelcomeMessage(aiMessages);
    setAiMessages(nextAiMessages);
    const latestMessage = nextAiMessages[nextAiMessages.length - 1];
    if (latestMessage) {
      setLastMessageMap((prev) => ({
        ...prev,
        [AI_USER.chatKey]: latestMessage.text,
      }));
      setLastMessageTimeMap((prev) => ({
        ...prev,
        [AI_USER.chatKey]: latestMessage.createdAt,
      }));
    }

    setOpenedUnreadCount(0);
    setShowInfoPanel(false);
    upsertChat(normalizeAIChat(AI_USER));
    setIsAIChat(true);
    setSelectedChat(normalizeAIChat(AI_USER));
    setMessages(nextAiMessages);
    setMobileChatOpen(isMobileView);
    setUnreadCounts((prev) => ({ ...prev, [AI_USER.chatKey]: 0 }));
    setError("");
    setSuggestions([]);
  };

  const handleAskAIFromEmpty = async () => {
    try {
      const data = await fetchAIChat();
      const chat = data?.chat || data;
      const persistedMessages = normalizeAIMessages(data?.messages || []);
      const nextAiMessages = ensureWelcomeMessage(persistedMessages);
      setAiMessages(nextAiMessages);
      setMessages(nextAiMessages);

      const latestMessage = nextAiMessages[nextAiMessages.length - 1];
      if (latestMessage) {
        setLastMessageMap((prev) => ({
          ...prev,
          [AI_USER.chatKey]: latestMessage.text,
        }));
        setLastMessageTimeMap((prev) => ({
          ...prev,
          [AI_USER.chatKey]: latestMessage.createdAt,
        }));
      }

      if (!chat) {
        const created = await createAIChat();
        const nextAI = normalizeAIChat(created?.chat || created || AI_USER);
        const createdMessages = ensureWelcomeMessage(normalizeAIMessages(created?.messages || []));
        setAiMessages(createdMessages);
        setMessages(createdMessages);
        upsertChat(nextAI);
        setIsAIChat(true);
        setSelectedChat(nextAI);
      } else {
        const nextAI = normalizeAIChat(chat);
        upsertChat(nextAI);
        setIsAIChat(true);
        setSelectedChat(nextAI);
      }

      setMobileChatOpen(isMobileView);
      setShowInfoPanel(false);
      setError("");
      setSuggestions([]);
    } catch {
      handleOpenAIChat();
    }
  };

  const handleStartChatFromEmpty = () => {
    setIsAIChat(false);
    handleOpenNewChat();
  };

  const handleToggleTaskPanel = () => {
    setShowTaskPanel((prev) => !prev);
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await completeTask(taskId);
      setTasks((prev) => prev.filter((task) => task._id !== taskId));
    } catch {
      setError("Failed to complete task");
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((task) => task._id !== taskId));
    } catch {
      setError("Failed to delete task");
    }
  };

  const ensureAllUsersLoaded = async () => {
    if (allUsers.length > 0) return;
    setLoadingAllUsers(true);
    try {
      const data = await fetchUsers();
      setAllUsers(data.users || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch users");
    } finally {
      setLoadingAllUsers(false);
    }
  };

  const handleSelectUserFromModal = (user) => {
    const userChat = normalizeUserChat(user);
    setOpenedUnreadCount(0);
    setShowInfoPanel(false);
    upsertChat(userChat);
    setIsAIChat(false);
    setSelectedChat(userChat);
    setUnreadCounts((prev) => ({ ...prev, [userChat.chatKey]: 0 }));
    setMobileChatOpen(isMobileView);
    setShowNewChatModal(false);
  };

  const handleCreateGroup = async (payload) => {
    const data = await createGroup(payload);
    const groupChat = normalizeGroupChat(data.group);
    setShowInfoPanel(false);
    upsertChat(groupChat);
    setIsAIChat(false);
    setSelectedChat(groupChat);
    setUnreadCounts((prev) => ({ ...prev, [groupChat.chatKey]: 0 }));
    setMobileChatOpen(isMobileView);
  };

  const handleOpenPersonalChat = (member) => {
    if (!member || String(member._id) === String(currentUser._id)) return;
    const userChat = normalizeUserChat(member);
    setOpenedUnreadCount(0);
    setShowInfoPanel(false);
    upsertChat(userChat);
    setSelectedChat(userChat);
    setUnreadCounts((prev) => ({ ...prev, [userChat.chatKey]: 0 }));
    setMobileChatOpen(isMobileView);
  };

  const handleAddGroupMembers = async (groupId, members) => {
    try {
      setManagingGroup(true);
      const data = await addGroupMembers(groupId, members);
      const updated = normalizeGroupChat(data.group);
      setChats((prev) => prev.map((chat) => (chat.chatKey === updated.chatKey ? updated : chat)));
      setSelectedChat((prev) => (prev?.chatKey === updated.chatKey ? updated : prev));
      await ensureAllUsersLoaded();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add members");
    } finally {
      setManagingGroup(false);
    }
  };

  const handleRemoveGroupMember = async (groupId, memberId) => {
    try {
      setManagingGroup(true);
      const data = await removeGroupMember(groupId, memberId);
      if (!data.group) {
        const deletedKey = `group:${groupId}`;
        setChats((prev) => prev.filter((chat) => chat.chatKey !== deletedKey));
        setSelectedChat((prev) => (prev?.chatKey === deletedKey ? null : prev));
        setMessages([]);
        return;
      }

      const updated = normalizeGroupChat(data.group);
      setChats((prev) => prev.map((chat) => (chat.chatKey === updated.chatKey ? updated : chat)));
      setSelectedChat((prev) => (prev?.chatKey === updated.chatKey ? updated : prev));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove member");
    } finally {
      setManagingGroup(false);
    }
  };

  const handleExitGroup = async (groupId) => {
    try {
      setManagingGroup(true);
      await exitGroup(groupId);
      const exitedKey = `group:${groupId}`;
      setChats((prev) => prev.filter((chat) => chat.chatKey !== exitedKey));
      setSelectedChat((prev) => (prev?.chatKey === exitedKey ? null : prev));
      setMessages([]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to exit group");
    } finally {
      setManagingGroup(false);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    setConfirmAction({
      type: "group",
      groupId,
      title: "Delete group?",
      description: "This will permanently delete the group and all messages.",
      confirmText: "Delete Group",
    });
  };

  const handleMakeGroupAdmin = async (groupId, userId) => {
    try {
      setManagingGroup(true);
      const data = await makeGroupAdmin(groupId, userId);
      const updated = normalizeGroupChat(data.group);
      setChats((prev) => prev.map((chat) => (chat.chatKey === updated.chatKey ? updated : chat)));
      setSelectedChat((prev) => (prev?.chatKey === updated.chatKey ? updated : prev));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update admin");
    } finally {
      setManagingGroup(false);
    }
  };

  const handleUpdateGroupDescription = async (groupId, description) => {
    try {
      setManagingGroup(true);
      const data = await updateGroupDescription(groupId, description);
      const updated = normalizeGroupChat(data.group);
      setChats((prev) => prev.map((chat) => (chat.chatKey === updated.chatKey ? updated : chat)));
      setSelectedChat((prev) => (prev?.chatKey === updated.chatKey ? updated : prev));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update description");
    } finally {
      setManagingGroup(false);
    }
  };

  const handleRequestDeleteMessage = (message) => {
    if (!message?._id) return;
    setConfirmAction({
      type: "message",
      messageId: message._id,
      title: "Delete message?",
      description: "Are you sure you want to delete this message?",
      confirmText: "Delete Message",
    });
  };

  const handleReactToMessage = async (message, emoji) => {
    const messageId = String(message?._id || "");
    if (!messageId || !emoji) return;

    const previousMessages = messages;
    const nextMessages = messages.map((msg) => {
      if (String(msg._id) !== messageId) return msg;

      const previousReactions = Array.isArray(msg.reactions) ? msg.reactions : [];
      const currentUserId = String(currentUser?._id || "");
      const existingIndex = previousReactions.findIndex(
        (reaction) => String(reaction?.userId?._id || reaction?.userId) === currentUserId
      );

      let nextReactions = [...previousReactions];
      if (existingIndex >= 0) {
        nextReactions[existingIndex] = {
          ...nextReactions[existingIndex],
          userId: nextReactions[existingIndex].userId || currentUserId,
          emoji,
        };
      } else {
        nextReactions.push({ userId: currentUserId, emoji });
      }

      return { ...msg, reactions: nextReactions };
    });

    setMessages(nextMessages);

    try {
      const data = await reactToMessage(messageId, emoji);
      if (data?.message?._id) {
        const savedId = String(data.message._id);
        setMessages((prev) =>
          prev.map((msg) => (String(msg._id) === savedId ? { ...msg, ...data.message } : msg))
        );
      }
    } catch (err) {
      setMessages(previousMessages);
      setError(err.response?.data?.message || "Failed to react to message");
    }
  };

  const handleRequestDeleteChat = (chat) => {
    if (!chat?._id) return;
    setConfirmAction({
      type: "chat",
      chatId: chat._id,
      chatKey: chat.chatKey,
      title: "Delete chat?",
      description: "This will remove this conversation from your sidebar.",
      confirmText: "Delete Chat",
    });
  };

  const handleConfirmDelete = async () => {
    if (!confirmAction) return;
    setDeletingAction(true);
    setError("");

    try {
      if (confirmAction.type === "message") {
        await deleteMessage(confirmAction.messageId);
        setMessages((prev) => {
          const next = prev.filter((msg) => String(msg._id) !== String(confirmAction.messageId));
          if (selectedChat?.chatKey) {
            updateChatPreviewFromMessages(selectedChat.chatKey, next);
          }
          return next;
        });
        await loadSidebarChats();
      } else if (confirmAction.type === "chat") {
        await deleteChat(confirmAction.chatId);
        const key = confirmAction.chatKey || `user:${confirmAction.chatId}`;
        setChats((prev) => prev.filter((chat) => chat.chatKey !== key));
        setSelectedChat((prev) => (prev?.chatKey === key ? null : prev));
        if (selectedChat?.chatKey === key) {
          setMessages([]);
        }
      } else if (confirmAction.type === "group") {
        setManagingGroup(true);
        await deleteGroup(confirmAction.groupId);
        const deletedKey = `group:${confirmAction.groupId}`;
        setChats((prev) => prev.filter((chat) => chat.chatKey !== deletedKey));
        setSelectedChat((prev) => (prev?.chatKey === deletedKey ? null : prev));
        if (selectedChat?.chatKey === deletedKey) {
          setMessages([]);
          navigate("/dashboard");
        }
      }

      setConfirmAction(null);
    } catch (err) {
      setError(err.response?.data?.message || "Delete action failed");
    } finally {
      setDeletingAction(false);
      setManagingGroup(false);
    }
  };

  if (loadingCurrentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-sm text-slate-500 dark:text-slate-300">{t(language, "loadingChat")}</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center dark:bg-slate-950">
        <p className="text-sm text-red-600">{error || t(language, "unableToLoadProfile")}</p>
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800"
        >
          {t(language, "backToLogin")}
        </button>
      </div>
    );
  }

  const hasSelectedChat = Boolean(selectedChat);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#f8fafc] via-[#eef2ff] to-[#e0f2fe] transition-all duration-200 ease-out dark:from-[#020617] dark:via-[#020617] dark:to-[#0f172a]">
      <div className="pointer-events-none absolute left-[-100px] top-[-100px] h-[300px] w-[300px] rounded-full bg-blue-400/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-100px] right-[-100px] h-[300px] w-[300px] rounded-full bg-purple-400/20 blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.02] dark:opacity-[0.03]" style={{ backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
      <div
        className={`relative z-10 mx-auto grid h-screen min-h-0 w-full max-w-[1600px] items-stretch overflow-hidden ${
          isMobileView ? "grid-cols-1" : hasSelectedChat ? "grid-cols-[320px_1fr_320px]" : "grid-cols-[320px_1fr]"
        }`}
      >
        <div className={`${isMobileView && mobileChatOpen ? "hidden" : "block"} h-full min-h-0 overflow-hidden`}>
          <UsersListPanel
            currentUser={currentUser}
            chats={chats}
            selectedChat={selectedChat}
            onSelectChat={handleSelectChat}
            onlineUsers={onlineUsers}
            lastMessageMap={lastMessageMap}
            lastMessageTimeMap={lastMessageTimeMap}
            unreadCounts={unreadCounts}
            loading={loadingUsers}
            error={error}
            onOpenNewChat={handleOpenNewChat}
            onOpenAIChat={handleOpenAIChat}
            onOpenSettings={handleOpenSettings}
            onRequestDeleteChat={handleRequestDeleteChat}
            tasks={tasks}
            showTaskPanel={showTaskPanel}
            onToggleTaskPanel={handleToggleTaskPanel}
            onCompleteTask={handleCompleteTask}
            onDeleteTask={handleDeleteTask}
            darkMode={darkMode}
            onToggleTheme={handleToggleTheme}
            onLogout={handleLogout}
            language={language}
          />
        </div>

        <div
          className={`${isMobileView ? (mobileChatOpen ? "block" : "hidden") : "m-2 rounded-2xl border border-white/20 bg-white/60 shadow-sm backdrop-blur-md transition-all duration-200 ease-out dark:bg-white/5"} h-full min-h-0 overflow-hidden flex flex-col`}
        >
          {hasSelectedChat ? (
            <ChatWindowPanel
              currentUser={currentUser}
              selectedChat={selectedChat}
              onlineUsers={onlineUsers}
              messages={messages}
              openedUnreadCount={openedUnreadCount}
              lastSeenAt={lastSeenMap[selectedChat?.chatKey] || ""}
              groupSummary={groupSummary}
              loadingGroupSummary={loadingGroupSummary}
              messageInput={messageInput}
              setMessageInput={setMessageInput}
              onMessageInputChange={handleMessageInputChange}
              typingUsers={typingUsers}
              selectedImageFile={selectedImageFile}
              selectedImagePreview={selectedImagePreview}
              suggestions={suggestions}
              onSelectSuggestion={(value) => setMessageInput(value)}
              supportPopup={supportPopup}
              onCloseSupportPopup={() => setSupportPopup(null)}
              onFileChange={handleImageFileChange}
              onClearSelectedImage={clearSelectedImage}
              onSendAudioMessage={handleSendAudioMessage}
              onSendMessage={handleSendMessage}
              onRequestDeleteMessage={handleRequestDeleteMessage}
              onReactToMessage={handleReactToMessage}
              onOpenInfoPanel={() => setShowInfoPanel(true)}
              onBack={() => {
                setShowInfoPanel(false);
                setMobileChatOpen(false);
              }}
              loading={loadingMessages}
              sendingMessage={sendingMessage}
              messagesEndRef={messagesEndRef}
              language={language}
              isMobileView={isMobileView}
            />
          ) : (
            <EmptyState onStartNewChat={handleStartChatFromEmpty} onAskAI={handleAskAIFromEmpty} />
          )}
        </div>

        {hasSelectedChat ? (
          <div
            className={`${
              isMobileView
                ? `fixed top-0 right-0 z-50 h-full w-full transform transition-transform duration-300 sm:w-[350px] ${
                    showInfoPanel ? "translate-x-0" : "translate-x-full"
                  }`
                : "static z-auto h-full min-h-0 w-auto overflow-hidden translate-x-0"
            }`}
          >
            <InfoPanel
              currentUser={currentUser}
              selectedChat={selectedChat}
              messages={messages}
              onlineUsers={onlineUsers}
              allUsers={allUsers}
              onOpenPersonalChat={handleOpenPersonalChat}
              onAddMembers={handleAddGroupMembers}
              onRemoveMember={handleRemoveGroupMember}
              onMakeAdmin={handleMakeGroupAdmin}
              onUpdateDescription={handleUpdateGroupDescription}
              onExitGroup={handleExitGroup}
              onDeleteGroup={handleDeleteGroup}
              managingGroup={managingGroup}
              showMobileClose={isMobileView}
              onCloseMobile={() => setShowInfoPanel(false)}
              language={language}
            />
          </div>
        ) : null}
      </div>

      {hasSelectedChat && isMobileView && showInfoPanel ? (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setShowInfoPanel(false)}
        />
      ) : null}

      <NewChatModal
        open={showNewChatModal}
        users={allUsers}
        loading={loadingAllUsers}
      onClose={() => setShowNewChatModal(false)}
      onSelectUser={handleSelectUserFromModal}
      onCreateGroup={handleCreateGroup}
      language={language}
    />

    <ConfirmModal
      open={Boolean(confirmAction)}
      title={confirmAction?.title || t(language, "confirmAction")}
      description={confirmAction?.description || ""}
      confirmText={confirmAction?.confirmText || t(language, "delete")}
      loading={deletingAction}
      onCancel={() => setConfirmAction(null)}
      onConfirm={handleConfirmDelete}
      language={language}
    />
    </div>
  );
};

export default Dashboard;

