import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, Check, CheckCheck, Info, Paperclip, Send, Smile, Trash2, Volume2, X } from "lucide-react";
import AudioMessageBubble from "./AudioMessageBubble";
import AudioRecorder from "./AudioRecorder";
import Modal from "../common/Modal";
import UserAvatar from "./UserAvatar";
import { AI_USER } from "../../constants/aiUser";
import { t } from "../../i18n";

const formatTime = (iso) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

const getDateLabel = (iso, language) => {
  try {
    const messageDate = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (a, b) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    if (isSameDay(messageDate, today)) return t(language, "today");
    if (isSameDay(messageDate, yesterday)) return t(language, "yesterday");

    return messageDate.toLocaleDateString([], {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const getSenderId = (sender) => (typeof sender === "object" ? sender?._id : sender);

const ChatWindowPanel = ({
  currentUser,
  selectedChat,
  onlineUsers,
  messages,
  openedUnreadCount,
  lastSeenAt,
  groupSummary,
  loadingGroupSummary,
  messageInput,
  setMessageInput,
  onMessageInputChange,
  typingUsers,
  selectedImageFile,
  selectedImagePreview,
  suggestions,
  onSelectSuggestion,
  supportPopup,
  onCloseSupportPopup,
  onFileChange,
  onClearSelectedImage,
  onSendAudioMessage,
  onSendMessage,
  onRequestDeleteMessage,
  onReactToMessage,
  onOpenInfoPanel,
  onBack,
  loading,
  sendingMessage,
  messagesEndRef,
  language = "en",
  isMobileView = false,
}) => {
  const [showSummary, setShowSummary] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [openEmojiPickerId, setOpenEmojiPickerId] = useState("");
  const [touchActionMessageId, setTouchActionMessageId] = useState("");
  const [hoveredMessageId, setHoveredMessageId] = useState("");
  const chatRef = useRef(null);
  const prevChatKeyRef = useRef("");
  const prevScrollHeightRef = useRef(0);
  const isNearBottomRef = useRef(true);
  const longPressTimerRef = useRef(null);
  const hideHoverTimerRef = useRef(null);
  const unreadDividerRef = useRef(null);
  const shouldShowSuggestions =
    selectedChat && Array.isArray(suggestions) && suggestions.length > 0 && !String(messageInput || "").trim();
  const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "😢"];
  const activeTypingUsers = Array.isArray(typingUsers)
    ? typingUsers.filter((user) => String(user.userId) !== String(currentUser?._id))
    : [];

  const typingText = (() => {
    if (!activeTypingUsers.length) return "";
    if (activeTypingUsers.length === 1) {
      return `${activeTypingUsers[0].userName} ${t(language, "typingSingle")}`;
    }
    if (activeTypingUsers.length <= 3) {
      return `${activeTypingUsers.map((user) => user.userName).join(", ")} ${t(language, "typingMulti")}`;
    }
    return `${activeTypingUsers.length} ${t(language, "typingPeople")}`;
  })();

  const isSelectedChatOnline =
    selectedChat?.type === "ai"
      ? true
      : selectedChat?.type === "user" && Array.isArray(onlineUsers)
        ? onlineUsers.includes(String(selectedChat._id))
        : false;

  useEffect(() => {
    if (selectedChat?.type === "group" && groupSummary?.summary) {
      setShowSummary(true);
    }
  }, [selectedChat?.chatKey, selectedChat?.type, groupSummary?.summary]);

  useEffect(() => {
    setOpenEmojiPickerId("");
    setTouchActionMessageId("");
  }, [selectedChat?.chatKey]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      if (hideHoverTimerRef.current) {
        clearTimeout(hideHoverTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedChat?.chatKey || selectedChat.type !== "user") return;
    if (!openedUnreadCount || !unreadDividerRef.current) return;
    const timer = setTimeout(() => {
      unreadDividerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 90);
    return () => clearTimeout(timer);
  }, [selectedChat?.chatKey, selectedChat?.type, messages.length, openedUnreadCount, lastSeenAt]);

  useEffect(() => {
    const container = chatRef.current;
    if (!container) return;

    const nextChatKey = selectedChat?.chatKey || "";
    const hasChanged = prevChatKeyRef.current !== nextChatKey;

    if (hasChanged) {
      requestAnimationFrame(() => {
        if (!chatRef.current) return;
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
        prevScrollHeightRef.current = chatRef.current.scrollHeight;
        isNearBottomRef.current = true;
      });
    }
  }, [selectedChat?.chatKey]);

  useLayoutEffect(() => {
    const container = chatRef.current;
    if (!container || !selectedChat?.chatKey) return;

    const nextChatKey = selectedChat.chatKey;
    const hasChanged = prevChatKeyRef.current !== nextChatKey;
    const currentScrollHeight = container.scrollHeight;
    const isGroupChat = selectedChat?.type === "group";

    if (hasChanged) {
      container.scrollTop = currentScrollHeight;
      isNearBottomRef.current = true;
      prevChatKeyRef.current = nextChatKey;
      prevScrollHeightRef.current = currentScrollHeight;
      return;
    }

    if (isGroupChat) {
      if (isNearBottomRef.current) {
        container.scrollTop = currentScrollHeight;
      } else if (currentScrollHeight > prevScrollHeightRef.current) {
        const delta = currentScrollHeight - prevScrollHeightRef.current;
        container.scrollTop += delta;
      }
    } else if (isNearBottomRef.current) {
      container.scrollTop = currentScrollHeight;
    }

    prevScrollHeightRef.current = currentScrollHeight;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    isNearBottomRef.current = distanceFromBottom <= 100;
  }, [messages, selectedChat?.chatKey, selectedChat?.type]);

  const handleChatScroll = () => {
    const container = chatRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    isNearBottomRef.current = distanceFromBottom <= 100;
  };

  const getSpeechLang = () => {
    const language = String(currentUser?.language || "en").toLowerCase();
    const map = {
      en: "en-IN",
      hi: "hi-IN",
      bn: "bn-IN",
      mr: "mr-IN",
      ta: "ta-IN",
      gu: "gu-IN",
    };
    return map[language] || "en-IN";
  };

  const handleSpeak = (text) => {
    const value = String(text || "").trim();
    if (!value || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = getSpeechLang();
    window.speechSynthesis.speak(utterance);
  };

  const getReactionUserId = (reaction) => String(reaction?.userId?._id || reaction?.userId || "");

  const buildReactionSummary = (reactions = []) => {
    const grouped = reactions.reduce((acc, reaction) => {
      const emoji = String(reaction?.emoji || "");
      if (!emoji) return acc;
      acc[emoji] = (acc[emoji] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped).map(([emoji, count]) => ({ emoji, count }));
  };

  const startLongPress = (messageId) => {
    if (!messageId) return;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = setTimeout(() => {
      setTouchActionMessageId(String(messageId));
    }, 450);
  };

  const endLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const renderStatusTicks = (message, isMine) => {
    if (!isMine || selectedChat?.type !== "user") return null;
    const status = String(message?.status || "sent");
    if (status === "read") return <CheckCheck size={13} className="text-red-400" />;
    if (status === "delivered") return <CheckCheck size={13} className="text-slate-400" />;
    return <Check size={13} className="text-slate-400" />;
  };

  const handleMessageMouseEnter = (messageId) => {
    if (hideHoverTimerRef.current) {
      clearTimeout(hideHoverTimerRef.current);
      hideHoverTimerRef.current = null;
    }
    setHoveredMessageId(String(messageId));
  };

  const handleMessageMouseLeave = (messageId) => {
    const id = String(messageId);
    if (hideHoverTimerRef.current) {
      clearTimeout(hideHoverTimerRef.current);
    }
    hideHoverTimerRef.current = setTimeout(() => {
      if (openEmojiPickerId !== id) {
        setHoveredMessageId((prev) => (prev === id ? "" : prev));
      }
      hideHoverTimerRef.current = null;
    }, 200);
  };

  const unreadStartByStatus =
    selectedChat?.type === "user"
      ? messages.findIndex((msg) => {
          const senderId = getSenderId(msg.senderId);
          const isMine = String(senderId) === String(currentUser?._id);
          return !isMine && String(msg?.status || "sent") !== "read";
        })
      : -1;

  const unreadStartIndex =
    unreadStartByStatus >= 0
      ? unreadStartByStatus
      : selectedChat?.type === "user" && openedUnreadCount > 0
        ? Math.max(messages.length - openedUnreadCount, 0)
        : -1;

  const renderedItems = [];
  let previousDayKey = "";
  messages.forEach((msg, index) => {
    const createdAt = msg?.createdAt || "";
    const dayKey = createdAt ? new Date(createdAt).toDateString() : "";

    if (dayKey && dayKey !== previousDayKey) {
      renderedItems.push({
        type: "date",
        key: `date-${dayKey}-${index}`,
                        label: getDateLabel(createdAt, language),
      });
      previousDayKey = dayKey;
    }

    if (index === unreadStartIndex) {
      renderedItems.push({
        type: "unread",
        key: `unread-${selectedChat?.chatKey || "chat"}`,
      });
    }

    renderedItems.push({
      type: "message",
      key: String(msg?._id || `${createdAt}-${index}`),
      message: msg,
    });
  });

  if (!selectedChat) {
    return (
      <section className="flex h-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-sm text-slate-500 dark:text-slate-400">{t(language, "selectUserToStart")}</p>
      </section>
    );
  }

  return (
    <section className="relative isolate flex h-full min-h-0 flex-col overflow-hidden bg-transparent transition-all duration-200 ease-out">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-10 h-64 w-64 rounded-full bg-[#2563EB]/6 blur-3xl dark:bg-[#2563EB]/12" />
        <div className="absolute bottom-10 right-14 h-72 w-72 rounded-full bg-[#7C3AED]/6 blur-3xl dark:bg-[#7C3AED]/12" />
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(#dbeafe 1px, transparent 1px)", backgroundSize: "20px 20px" }}
        />
      </div>
      <header className="z-20 shrink-0 flex items-center gap-3 border-b border-slate-200/80 bg-white/85 px-4 py-3 shadow-sm backdrop-blur-md transition-all duration-200 ease-out dark:border-slate-800 dark:bg-slate-900/80">
        {isMobileView ? (
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ease-out hover:scale-110 hover:bg-slate-200 dark:hover:bg-slate-700"
            onClick={onBack}
            aria-label="Back"
            title={t(language, "back")}
          >
            <ArrowLeft size={20} />
          </button>
        ) : null}
        <UserAvatar
          userId={selectedChat._id}
          name={selectedChat.name}
          src={selectedChat.profilePic}
          sizeClass="h-9 w-9"
          textClass="text-xs"
          isAI={Boolean(selectedChat?.isAI)}
        />
        <div className="flex flex-col">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedChat.name}</p>
          {selectedChat.type === "group" ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {`${selectedChat.members?.length || 0} ${t(language, "members")}`}
            </p>
          ) : (
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <span
                className={`h-2 w-2 rounded-full ${
                  isSelectedChatOnline ? "bg-green-500 animate-pulse" : "bg-slate-400"
                }`}
              />
              <span className="opacity-80">{isSelectedChatOnline ? t(language, "online") : t(language, "offline")}</span>
            </div>
          )}
        </div>
        {isMobileView ? (
          <button
            type="button"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ease-out hover:scale-110 hover:bg-slate-200 dark:hover:bg-slate-700"
            onClick={onOpenInfoPanel}
            aria-label="Open info panel"
            title="Info"
          >
            <Info size={16} />
          </button>
        ) : null}
      </header>

      <div className="z-10 min-h-5 shrink-0 px-4 pt-1">
        {typingText ? (
          <p className="text-xs italic text-slate-400 opacity-90 transition-all duration-200 ease-in-out dark:text-slate-500">
            {typingText}
          </p>
        ) : null}
      </div>

      <div
        ref={chatRef}
        onScroll={handleChatScroll}
        className="z-10 flex-1 min-h-0 overflow-y-auto scroll-smooth px-4 py-4"
      >
        {loading ? (
          <div className="space-y-3">
            <div className="h-3 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-12 w-3/4 animate-pulse rounded-2xl bg-slate-200/90 dark:bg-slate-700/90" />
            <div className="ml-auto h-12 w-2/3 animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-700/80" />
          </div>
        ) : null}

        <div className="space-y-3">
          {renderedItems.map((item) => {
            if (item.type === "date") {
              return (
                <div key={item.key} className="flex justify-center">
                  <span className="rounded-full bg-slate-200/90 px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                    {item.label}
                  </span>
                </div>
              );
            }

            if (item.type === "unread") {
              return (
                <div key={item.key} ref={unreadDividerRef} className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-amber-300/80 dark:bg-amber-500/40" />
                  <span className="rounded-full bg-amber-100 px-3 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    {t(language, "unreadMessages")}
                  </span>
                  <div className="h-px flex-1 bg-amber-300/80 dark:bg-amber-500/40" />
                </div>
              );
            }

            const msg = item.message;
            const senderId = getSenderId(msg.senderId);
            const isMine = String(senderId) === String(currentUser._id);
            const isAIMessage =
              String(senderId) === String(AI_USER._id) || String(senderId) === "ai";
            const showGroupTranslation =
              selectedChat.type === "group" && !isMine && Boolean(msg.translatedText);
            const displayText = !isMine && msg.translatedText ? msg.translatedText : msg.text;
            const senderName =
              typeof msg.senderId === "object"
                ? msg.senderId?.name
                : selectedChat.members?.find((member) => String(member._id) === String(senderId))?.name;
            const reactions = Array.isArray(msg.reactions) ? msg.reactions : [];
            const reactionSummary = buildReactionSummary(reactions);
            const isActionVisible = touchActionMessageId === String(msg._id);
            const myReaction = reactions.find(
              (reaction) => getReactionUserId(reaction) === String(currentUser?._id)
            );

            return (
              <div
                key={item.key}
                className={`message-fade-in flex ${isMine ? "justify-end" : "justify-start"}`}
                onTouchStart={() => startLongPress(msg._id)}
                onTouchEnd={endLongPress}
                onTouchCancel={endLongPress}
              >
                <div
                  className={`relative max-w-[78%] ${reactionSummary.length > 0 ? "pb-3" : ""}`}
                  onMouseEnter={() => handleMessageMouseEnter(msg._id)}
                  onMouseLeave={() => handleMessageMouseLeave(msg._id)}
                >
                  <div
                    className={`absolute top-0 z-20 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-white shadow-lg backdrop-blur-md transition-all duration-200 ease-in-out ${
                      isMine ? "right-full mr-2" : "left-full ml-2"
                    } ${
                      hoveredMessageId === String(msg._id) ||
                      isActionVisible ||
                      openEmojiPickerId === String(msg._id)
                        ? "pointer-events-auto opacity-100 scale-100 delay-75"
                        : "pointer-events-none opacity-0 scale-95"
                    }`}
                    onMouseEnter={() => handleMessageMouseEnter(msg._id)}
                    onMouseLeave={() => handleMessageMouseLeave(msg._id)}
                  >
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          handleMessageMouseEnter(msg._id);
                          setOpenEmojiPickerId((prev) =>
                            prev === String(msg._id) ? "" : String(msg._id)
                          );
                        }}
                        className="rounded-full p-1.5 transition-all duration-200 ease-in-out hover:scale-110 hover:bg-white/10"
                        aria-label="React"
                      >
                        <Smile size={14} />
                      </button>

                      {openEmojiPickerId === String(msg._id) ? (
                        <div
                          className={`absolute top-9 z-50 flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1.5 shadow-xl transition-all duration-200 ease-in-out dark:border-slate-700 dark:bg-slate-900 ${
                            isMine ? "right-0" : "left-0"
                          }`}
                          onMouseEnter={() => handleMessageMouseEnter(msg._id)}
                        >
                          {EMOJI_OPTIONS.map((emoji) => (
                            <button
                              key={`${msg._id}-${emoji}`}
                              type="button"
                              onClick={() => {
                                setOpenEmojiPickerId("");
                                onReactToMessage?.(msg, emoji);
                              }}
                              className={`rounded-full px-1.5 py-0.5 text-base transition-all duration-200 ease-in-out hover:scale-110 hover:bg-slate-100 dark:hover:bg-slate-700 ${
                                myReaction?.emoji === emoji ? "bg-slate-200 dark:bg-slate-700" : ""
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSpeak(displayText || msg.text)}
                      className="rounded-full p-1.5 transition-all duration-200 ease-in-out hover:scale-110 hover:bg-white/10"
                      aria-label="Speak message"
                    >
                      <Volume2 size={14} />
                    </button>

                    {isMine ? (
                      <button
                        type="button"
                        onClick={() => onRequestDeleteMessage?.(msg)}
                        className="rounded-full p-1.5 text-red-200 transition-all duration-200 ease-in-out hover:scale-110 hover:bg-red-500/20 hover:text-red-100"
                        aria-label="Delete message"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : null}
                  </div>

                  <div
                    onDoubleClick={() => onReactToMessage?.(msg, "👍")}
                    className={`rounded-2xl px-4 py-2.5 text-sm transition-all duration-200 ease-out hover:scale-[1.01] ${
                      isMine
                        ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md hover:shadow-lg"
                        : isAIMessage
                          ? "bg-gradient-to-r from-[#2563EB]/10 to-[#7C3AED]/10 text-[#0F172A] shadow-sm ring-1 ring-[#2563EB]/25 dark:text-slate-100 dark:ring-[#2563EB]/35"
                          : "border border-white/20 bg-white/80 text-[#0F172A] shadow-sm backdrop-blur-md dark:bg-white/5 dark:text-slate-100"
                    }`}
                  >
                    {selectedChat.type === "group" && !isMine ? (
                      <p className="mb-1 text-[11px] font-semibold text-cyan-700 dark:text-cyan-300">
                        {senderName || "Unknown"}
                      </p>
                    ) : null}
                    {msg.type === "audio" || msg.audioUrl ? (
                      <div className="mb-2">
                        <AudioMessageBubble
                          src={msg.audioUrl}
                          duration={msg.duration}
                          isMine={isMine}
                        />
                      </div>
                    ) : null}
                    {msg.image ? (
                      <img
                        src={msg.image}
                        alt="Shared"
                        onClick={() => setImagePreview(msg.image)}
                        className="mb-2 max-h-64 w-full max-w-[280px] cursor-zoom-in rounded-xl object-cover transition duration-200 hover:scale-[1.02]"
                      />
                    ) : null}
                    {displayText ? <p className="break-words">{displayText}</p> : null}
                    {showGroupTranslation && msg.text ? (
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{msg.text}</p>
                    ) : null}
                    <div
                      className={`mt-1 flex items-center justify-end gap-1 text-xs ${
                        isMine ? "text-cyan-100/70" : "text-slate-400"
                      }`}
                    >
                      <span className="opacity-70">{formatTime(msg.createdAt)}</span>
                      {renderStatusTicks(msg, isMine)}
                    </div>
                  </div>

                  {reactionSummary.length > 0 ? (
                    <div
                      className={`absolute -bottom-1 translate-y-1 flex items-center gap-1 rounded-full bg-slate-100 px-2 py-[2px] dark:bg-slate-700 ${
                        isMine ? "right-3" : "left-3"
                      }`}
                    >
                      {reactionSummary.map((reaction) => (
                        <span
                          key={`${msg._id}-reaction-${reaction.emoji}`}
                          className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-100"
                        >
                          <span className="text-base leading-none">{reaction.emoji}</span>
                          {selectedChat.type === "group" ? (
                            <span className="text-[10px] leading-none">{reaction.count}</span>
                          ) : null}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {groupSummary?.summary && showSummary && !loadingGroupSummary ? (
        <div className="pointer-events-none fixed bottom-24 right-6 z-50 w-80">
          <div className="pointer-events-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-gray-800">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {`🔔 ${groupSummary.unreadCount} ${t(language, "unreadMessages").toLowerCase()}`}
              </p>
              <button
                type="button"
                onClick={() => setShowSummary(false)}
                className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                aria-label="Close summary"
                title={t(language, "close")}
              >
                ✖
              </button>
            </div>
            <p className="text-sm whitespace-pre-line text-slate-700 dark:text-slate-200">{groupSummary.summary}</p>
          </div>
        </div>
      ) : null}

      {supportPopup?.response ? (
        <div className="pointer-events-none fixed top-20 right-6 z-[9999] w-80 p-4">
          <div
            className={`pointer-events-auto rounded-xl border p-4 shadow-xl transition-all duration-300 ${
              supportPopup.emotion === "sad"
                ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
                : supportPopup.emotion === "stress"
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20"
                  : supportPopup.emotion === "anger" || supportPopup.type === "spam"
                    ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
                    : "border-slate-200 bg-white dark:border-slate-700 dark:bg-gray-800"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {supportPopup.type === "spam"
                  ? "⚠️"
                  : supportPopup.emotion === "sad"
                    ? "💙"
                    : supportPopup.emotion === "stress"
                      ? "🌿"
                      : supportPopup.emotion === "anger"
                        ? "⚠️"
                        : "💬"}
              </p>
              <button
                type="button"
                onClick={onCloseSupportPopup}
                className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                aria-label="Close support popup"
                title={t(language, "close")}
              >
                x
              </button>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-200">{supportPopup.response}</p>
          </div>
        </div>
      ) : null}

      <div className="z-20 shrink-0 border-t border-white/20 bg-white/60 p-3 backdrop-blur-md transition-all duration-200 ease-out supports-[backdrop-filter]:bg-white/75 dark:border-slate-800 dark:bg-white/5 dark:supports-[backdrop-filter]:bg-slate-900/75">
        {shouldShowSuggestions ? (
          <div className="suggestion-fade-in mb-2 rounded-2xl border border-white/70 bg-white/70 p-3 shadow-lg backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-800/70">
            <div className="flex gap-2 overflow-x-auto pb-1">
            {suggestions.map((item, index) => (
              <button
                key={`${item}-${index}`}
                type="button"
                onClick={() => onSelectSuggestion(item)}
                className="whitespace-nowrap rounded-full border border-[#2563EB]/15 bg-gradient-to-r from-[#2563EB]/10 to-[#7C3AED]/10 px-4 py-2 text-sm text-[#0F172A] shadow-sm transition-all duration-200 active:scale-95 hover:scale-105 hover:shadow-md dark:border-indigo-500/30 dark:text-slate-100"
              >
                {item}
              </button>
            ))}
            </div>
          </div>
        ) : null}

        {selectedImageFile ? (
          <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                  {selectedImageFile.name}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Ready to send</p>
              </div>
              <button
                type="button"
                onClick={onClearSelectedImage}
                className="rounded-md border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:bg-white dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Remove
              </button>
            </div>
            {selectedImagePreview ? (
              <img
                src={selectedImagePreview}
                alt="Preview"
                className="mt-2 h-20 w-20 rounded-md border border-slate-200 object-cover"
              />
            ) : null}
          </div>
        ) : null}

        <form onSubmit={onSendMessage} className="flex items-center gap-2">
          <AudioRecorder
            disabled={sendingMessage || !selectedChat || selectedChat?.type === "ai"}
            onSend={onSendAudioMessage}
          />
          <div className="relative flex-1">
            <label
              className="absolute left-2.5 top-1/2 z-10 -translate-y-1/2 cursor-pointer rounded-full p-1.5 text-slate-600 transition hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
              aria-label="Attach file"
              title="Attach"
            >
              <Paperclip size={17} />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onFileChange(e.target.files?.[0])}
              />
            </label>

            <input
              type="text"
              placeholder={t(language, "typeMessage")}
              value={messageInput}
              onChange={(e) =>
                onMessageInputChange ? onMessageInputChange(e.target.value) : setMessageInput(e.target.value)
              }
              className="w-full rounded-full border border-slate-300 bg-white py-2.5 pl-12 pr-4 text-sm shadow-sm outline-none transition-all duration-200 ease-out focus:scale-[1.01] focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
          </div>

          <button
            type="submit"
            disabled={sendingMessage}
            className="rounded-full bg-gradient-to-r from-blue-500 to-purple-600 p-2.5 text-white shadow-md shadow-indigo-500/20 transition-all duration-200 ease-out hover:scale-[1.03] hover:shadow-lg active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Send message"
            title="Send"
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      {imagePreview ? (
        <Modal onClose={() => setImagePreview("")}>
          <div className="mx-auto flex w-full max-w-3xl items-center justify-center">
            <button
              type="button"
              onClick={() => setImagePreview("")}
              className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-slate-700 transition hover:bg-white"
              aria-label="Close image preview"
            >
              <X size={18} />
            </button>
            <img
              src={imagePreview}
              alt="Preview"
              className="max-h-[80vh] w-auto max-w-[92vw] rounded-xl object-contain shadow-2xl"
            />
          </div>
        </Modal>
      ) : null}
    </section>
  );
};

export default ChatWindowPanel;
