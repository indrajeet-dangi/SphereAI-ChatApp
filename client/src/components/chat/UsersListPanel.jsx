import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Bot, Check, LogOut, MessageSquarePlus, Moon, MoreVertical, Sun, Trash2, X } from "lucide-react";
import UserAvatar from "./UserAvatar";
import Modal from "../common/Modal";
import { t } from "../../i18n";

const UsersListPanel = ({
  currentUser,
  chats,
  selectedChat,
  onSelectChat,
  onlineUsers,
  lastMessageMap,
  lastMessageTimeMap,
  unreadCounts,
  loading,
  error,
  onOpenNewChat,
  onOpenAIChat,
  onOpenSettings,
  onRequestDeleteChat,
  tasks,
  showTaskPanel,
  onToggleTaskPanel,
  onCompleteTask,
  onDeleteTask,
  darkMode,
  onToggleTheme,
  onLogout,
  language = "en",
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [openChatMenuKey, setOpenChatMenuKey] = useState("");
  const [bellShake, setBellShake] = useState(false);
  const prevTaskCountRef = useRef(tasks.length);

  useEffect(() => {
    if (tasks.length > prevTaskCountRef.current) {
      setBellShake(true);
      const timer = setTimeout(() => setBellShake(false), 700);
      prevTaskCountRef.current = tasks.length;
      return () => clearTimeout(timer);
    }
    prevTaskCountRef.current = tasks.length;
    return undefined;
  }, [tasks.length]);

  const visibleChats = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const indexedUsers = chats
      .filter((chat) => {
        const chatKey = chat.chatKey || `${chat.type || "user"}:${chat._id}`;
        if (chat.isAI || chat.type === "ai") {
          return Boolean(lastMessageMap?.[chatKey] || (unreadCounts?.[chatKey] || 0) > 0);
        }
        return true;
      })
      .map((user, index) => ({ user, index }));

    const filtered = indexedUsers.filter(({ user }) =>
      user.name?.toLowerCase().includes(normalizedSearch)
    );

    filtered.sort((a, b) => {
      const keyA = a.user.chatKey || `${a.user.type || "user"}:${a.user._id}`;
      const keyB = b.user.chatKey || `${b.user.type || "user"}:${b.user._id}`;
      const timeA = new Date(lastMessageTimeMap?.[keyA] || 0).getTime();
      const timeB = new Date(lastMessageTimeMap?.[keyB] || 0).getTime();
      if (timeA !== timeB) return timeB - timeA;
      return a.index - b.index;
    });

    return filtered.map((item) => item.user);
  }, [chats, searchTerm, lastMessageTimeMap, lastMessageMap, unreadCounts]);

  const formatTime = (iso) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <aside className="relative flex h-full min-h-0 flex-col overflow-hidden border-r border-gray-200 bg-white/70 backdrop-blur-lg transition-all duration-200 ease-out dark:border-gray-800 dark:bg-[#020617]/80">
      <div className="border-b border-slate-200/70 px-4 py-4 dark:border-slate-800/80">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="group flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md transition-transform duration-200 hover:rotate-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M7.5 12c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5-2 4.5-4.5 4.5S7.5 14.5 7.5 12Z"
                  stroke="white"
                  strokeWidth="1.6"
                  opacity="0.92"
                />
                <path
                  d="M12 7.5V5M12 19v-2.5M7.5 12H5M19 12h-2.5M8.4 8.4 6.7 6.7M17.3 17.3l-1.7-1.7M15.6 8.4l1.7-1.7M6.7 17.3l1.7-1.7"
                  stroke="white"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  opacity="0.9"
                />
                <circle cx="12" cy="5" r="1.2" fill="white" opacity="0.9" />
                <circle cx="12" cy="19" r="1.2" fill="white" opacity="0.9" />
                <circle cx="5" cy="12" r="1.2" fill="white" opacity="0.9" />
                <circle cx="19" cy="12" r="1.2" fill="white" opacity="0.9" />
                <circle cx="6.7" cy="6.7" r="1.1" fill="white" opacity="0.85" />
                <circle cx="17.3" cy="17.3" r="1.1" fill="white" opacity="0.85" />
                <circle cx="17.3" cy="6.7" r="1.1" fill="white" opacity="0.85" />
                <circle cx="6.7" cy="17.3" r="1.1" fill="white" opacity="0.85" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold tracking-tight text-[#0F172A] dark:text-slate-100">
              Sphere
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={onToggleTaskPanel}
                className={`rounded-full p-2 text-[#64748B] transition-all duration-200 ease-out hover:scale-110 hover:rotate-12 hover:bg-white hover:text-blue-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-400 ${bellShake ? "animate-bell-shake" : ""}`}
                aria-label={t(language, "notifications")}
                title={t(language, "notifications")}
              >
                <Bell size={20} />
              </button>
              {tasks.length > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 min-w-4 animate-pulse rounded-full bg-red-500 px-1 text-center text-[10px] font-semibold text-white">
                  {tasks.length > 99 ? "99+" : tasks.length}
                </span>
              ) : null}
            </div>
              <button
                type="button"
                onClick={onToggleTheme}
                className="rounded-full p-2 text-[#64748B] transition-all duration-200 ease-out hover:scale-110 hover:bg-white hover:text-blue-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                aria-label={t(language, "darkMode")}
                title={t(language, "darkMode")}
              >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-full p-2 text-red-500 transition-all duration-200 ease-out hover:scale-110 hover:bg-red-50 hover:shadow-lg dark:hover:bg-red-900/20"
                aria-label="Logout"
                title="Logout"
              >
              <LogOut size={20} />
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              className="h-8 w-8 overflow-hidden rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm transition-all duration-200 ease-out hover:scale-[1.03] hover:shadow-lg hover:ring-2 hover:ring-blue-400 active:scale-[0.97]"
              aria-label={t(language, "profileSettings")}
              title={t(language, "profileSettings")}
            >
              <img
                src={
                  currentUser?.profilePic ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    currentUser?.name || "User"
                  )}&background=random&color=fff&bold=true`
                }
                alt={currentUser?.name || "Profile"}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    currentUser?.name || "User"
                  )}&background=random&color=fff&bold=true`;
                }}
              />
            </button>
          </div>
        </div>

        <div className="relative mt-3">
          <input
            type="text"
            placeholder={t(language, "searchChats")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 pr-10 text-sm text-[#0F172A] transition-all duration-200 ease-out focus:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-100 dark:placeholder:text-slate-400"
          />
          {searchTerm ? (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
              aria-label="Clear chat search"
              title="Clear"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>

      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pb-20 px-1">
        {loading ? (
          <div className="space-y-2 px-4 py-3">
            <div className="h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-slate-200/90 dark:bg-slate-700/90" />
          </div>
        ) : null}
        {error ? <p className="px-4 py-3 text-sm text-red-600">{error}</p> : null}

        {visibleChats.map((user) => {
          const chatKey = user.chatKey || `${user.type || "user"}:${user._id}`;
          const isActive = selectedChat?.chatKey === chatKey;
          const unreadCount = unreadCounts?.[chatKey] || 0;
          const lastMessage =
            lastMessageMap[chatKey] ||
            (user.type === "ai" ? t(language, "startAiChat") : user.email || t(language, "noMessagesYet"));
          const lastMessageTime = formatTime(lastMessageTimeMap?.[chatKey]);

          return (
            <div
              key={chatKey}
              onClick={() => onSelectChat(user)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectChat(user);
                }
              }}
            className={`mx-2 my-1 flex w-[calc(100%-1rem)] items-center gap-3 rounded-xl border border-transparent border-l-4 px-3 py-2 text-left transition-all duration-200 ease-out ${
                isActive
                  ? "border-l-blue-500 bg-gradient-to-r from-[#2563EB]/10 to-[#7C3AED]/10 shadow-md shadow-[#2563EB]/10 dark:bg-slate-800/90"
                  : "border-l-transparent hover:bg-white/60 hover:shadow-sm hover:scale-[1.01] dark:hover:bg-white/5"
              }`}
            >
              <UserAvatar
                userId={user._id}
                name={user.name}
                src={user.profilePic}
                sizeClass="h-10 w-10"
                textClass="text-sm"
                isAI={Boolean(user.isAI)}
                showOnline={!user.isGroup}
                isOnline={user.isAI ? true : onlineUsers.includes(String(user._id))}
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>
                  {lastMessageTime ? <span className="text-[10px] text-slate-400 dark:text-slate-500">{lastMessageTime}</span> : null}
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{lastMessage}</p>
                  {unreadCount > 0 ? (
                    <span className="flex min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-[#2563EB] to-[#7C3AED] px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </div>
              </div>

              {!user.isAI && !user.isGroup ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenChatMenuKey((prev) => (prev === chatKey ? "" : chatKey));
                    }}
                    className="rounded-full p-1 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                    aria-label="Chat actions"
                  >
                    <MoreVertical size={14} />
                  </button>

                  {openChatMenuKey === chatKey ? (
                    <div className="absolute right-0 top-7 z-30 min-w-28 rounded-lg border border-slate-200 bg-white p-1 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenChatMenuKey("");
                          onRequestDeleteChat?.(user);
                        }}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={12} />
                        Delete chat
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}

        {!loading && visibleChats.length === 0 ? (
          <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{t(language, "noUsersAvailable")}</p>
        ) : null}
      </div>

      {selectedChat ? (
        <>
          <div className="group absolute bottom-20 right-4">
            <button
              type="button"
              onClick={onOpenAIChat}
              className="relative isolate flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 ease-out before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-blue-500/20 before:blur-lg hover:scale-110 hover:shadow-xl active:scale-[0.97]"
              aria-label="Open AI chat"
              title="AI Chat"
            >
              <Bot size={20} />
            </button>
            <div className="pointer-events-none absolute left-[-140px] top-1/2 -translate-y-1/2 translate-x-2 whitespace-nowrap rounded-md bg-[#111827] px-2.5 py-1 text-[12px] text-white opacity-0 transition duration-200 group-hover:translate-x-0 group-hover:opacity-100">
              Chat with AI
            </div>
          </div>

          <div className="group absolute bottom-4 right-4">
            <button
              type="button"
              onClick={onOpenNewChat}
              className="relative isolate flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25 transition-all duration-200 ease-out before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-blue-500/20 before:blur-lg hover:scale-110 hover:shadow-xl active:scale-[0.97]"
              aria-label="Start new chat"
              title={t(language, "newChat")}
            >
              <MessageSquarePlus size={20} />
            </button>
            <div className="pointer-events-none absolute left-[-140px] top-1/2 -translate-y-1/2 translate-x-2 whitespace-nowrap rounded-md bg-[#111827] px-2.5 py-1 text-[12px] text-white opacity-0 transition duration-200 group-hover:translate-x-0 group-hover:opacity-100">
              Start New Chat
            </div>
          </div>
        </>
      ) : null}

      {showTaskPanel ? (
        <Modal onClose={onToggleTaskPanel} contentClassName="max-w-[420px]">
          <div className="mx-auto w-full rounded-xl border border-slate-200 bg-white p-4 shadow-xl transition dark:border-slate-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t(language, "notifications")}</h3>
              <button
                type="button"
                onClick={onToggleTaskPanel}
                className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                aria-label={t(language, "close")}
                title={t(language, "close")}
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {tasks.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{t(language, "noReminders")} 🎉</p>
              ) : (
                tasks.map((task) => {
                  const isExpired = task.dueDate && new Date(task.dueDate).getTime() < Date.now();
                  return (
                    <div
                      key={task._id}
                      className={`mb-2 rounded-lg p-3 last:mb-0 ${
                        isExpired
                          ? "border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                          : "bg-gray-100 dark:bg-gray-700"
                      }`}
                    >
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{task.title || task.text}</p>
                      {task.description ? (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{task.description}</p>
                      ) : null}
                      {task.dueDate ? (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                          {t(language, "due")}: {new Date(task.dueDate).toLocaleString()}
                        </p>
                      ) : null}
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onCompleteTask(task._id)}
                          className="rounded-md p-1.5 text-emerald-600 transition hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                          aria-label="Complete task"
                          title="Complete"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTask(task._id)}
                          className="rounded-md p-1.5 text-red-500 transition hover:bg-red-100 dark:hover:bg-red-900/30"
                          aria-label="Delete task"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Modal>
      ) : null}
    </aside>
  );
};

export default UsersListPanel;
