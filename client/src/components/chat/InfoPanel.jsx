import { useEffect, useMemo, useState } from "react";
import {
  BellOff,
  Edit3,
  Image as ImageIcon,
  LogOut,
  MoreVertical,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import UserAvatar from "./UserAvatar";
import { AI_USER } from "../../constants/aiUser";
import { t } from "../../i18n";
import { makeGroupAdmin, updateGroupDescription } from "../../services/api";

const InfoPanel = ({
  currentUser,
  selectedChat,
  messages,
  onlineUsers,
  allUsers,
  onOpenPersonalChat,
  onAddMembers,
  onRemoveMember,
  onMakeAdmin,
  onUpdateDescription,
  onExitGroup,
  onDeleteGroup,
  managingGroup,
  className = "",
  showMobileClose = false,
  onCloseMobile,
  language = "en",
}) => {
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [openMemberMenuId, setOpenMemberMenuId] = useState("");
  const [previewImage, setPreviewImage] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [groupDescription, setGroupDescription] = useState("");
  const [uiNotice, setUiNotice] = useState("");

  const imageMessages = useMemo(() => messages.filter((msg) => msg.image), [messages]);
  const isGroup = selectedChat?.type === "group";
  const isAIChat = selectedChat?.type === "ai";
  const isAdmin = isGroup && String(selectedChat?.admin?._id || selectedChat?.admin) === String(currentUser?._id);
  const memberCount = selectedChat?.members?.length || 0;
  const displayName = isAIChat ? AI_USER.name : selectedChat?.name;
  const displayBio = isAIChat
    ? AI_USER.bio
    : selectedChat?.bio || "Your intelligent AI assistant for smart conversations.";
  const isSelectedOnline = isAIChat
    ? true
    : selectedChat?.type === "user"
      ? onlineUsers?.includes(String(selectedChat?._id))
      : false;

  useEffect(() => {
    setGroupDescription(selectedChat?.description || "");
    setSearchTerm("");
    setOpenMemberMenuId("");
    setIsEditingDesc(false);
  }, [selectedChat?._id]);

  const handleSaveDescription = async () => {
    if (!selectedChat?._id) return;
    try {
      if (typeof onUpdateDescription === "function") {
        await onUpdateDescription(selectedChat._id, groupDescription);
      } else {
        await updateGroupDescription(selectedChat._id, groupDescription);
      }
      setUiNotice(t(language, "updated") || "Updated");
      setIsEditingDesc(false);
    } catch (err) {
      setUiNotice(err?.response?.data?.message || "Failed to save description");
    }
  };

  const handleMakeAdmin = async (memberId) => {
    if (!selectedChat?._id || !memberId) return;
    try {
      if (typeof onMakeAdmin === "function") {
        await onMakeAdmin(selectedChat._id, memberId);
      } else {
        await makeGroupAdmin(selectedChat._id, memberId);
      }
      setUiNotice("Admin updated");
    } catch (err) {
      setUiNotice(err?.response?.data?.message || "Failed to update admin");
    }
  };

  useEffect(() => {
    if (!uiNotice) return undefined;
    const timer = setTimeout(() => setUiNotice(""), 1800);
    return () => clearTimeout(timer);
  }, [uiNotice]);

  const addableUsers = useMemo(() => {
    if (!isGroup) return [];
    const memberSet = new Set((selectedChat.members || []).map((member) => String(member._id || member)));
    return (allUsers || []).filter((user) => !memberSet.has(String(user._id)));
  }, [allUsers, isGroup, selectedChat?.members]);

  const filteredMembers = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return selectedChat?.members || [];
    return (selectedChat?.members || []).filter((member) => {
      const name = String(member?.name || "").toLowerCase();
      const email = String(member?.email || "").toLowerCase();
      return name.includes(normalized) || email.includes(normalized);
    });
  }, [searchTerm, selectedChat?.members]);

  const handleToggleCandidate = (userId) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleConfirmAddMembers = async () => {
    if (!selectedChat?._id || selectedMemberIds.length === 0) return;
    await onAddMembers(selectedChat._id, selectedMemberIds);
    setSelectedMemberIds([]);
    setShowAddMembers(false);
  };

  const formatLastActive = (member) => {
    const source = member?.lastSeenAt || member?.updatedAt || member?.lastActiveAt;
    if (!source) return t(language, "online");
    try {
      return `Last active ${new Date(source).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      return t(language, "online");
    }
  };

  return (
    <aside
      className={`h-full min-h-0 overflow-hidden border-l border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 flex flex-col ${className}`}
    >
      {showMobileClose ? (
        <div className="flex items-center justify-end border-b border-slate-200 px-4 py-2 dark:border-slate-700 lg:hidden">
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-full p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close info panel"
            title={t(language, "close")}
          >
            <X size={18} />
          </button>
        </div>
      ) : null}
      {selectedChat ? (
        <>
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-5 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
            <div className="rounded-2xl bg-gradient-to-br from-cyan-500/10 via-sky-500/10 to-indigo-500/10 p-4 text-center dark:from-cyan-400/20 dark:via-sky-400/20 dark:to-indigo-400/20">
              <div className="group mx-auto w-fit">
                <div className="transition duration-200 group-hover:scale-105 group-hover:drop-shadow-lg">
                  <UserAvatar
                    userId={selectedChat._id}
                    name={displayName}
                    src={isAIChat ? AI_USER.avatar : selectedChat.profilePic}
                    sizeClass="h-20 w-20"
                    textClass="text-xl"
                    isAI={Boolean(selectedChat?.isAI)}
                  />
                </div>
              </div>
              <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-slate-100">{displayName}</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {isGroup
                  ? `${memberCount} ${t(language, "members")}`
                  : displayBio}
              </p>
              {!isGroup ? (
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <span className={`h-2 w-2 rounded-full ${isSelectedOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
                  <span>{isSelectedOnline ? t(language, "online") : t(language, "offline")}</span>
                </div>
              ) : null}

              {isGroup ? (
                <div className="mt-3 text-left">
                  {isEditingDesc ? (
                    <div className="space-y-2">
                      <textarea
                        value={groupDescription}
                        onChange={(e) => setGroupDescription(e.target.value)}
                        rows={2}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 outline-none ring-cyan-200 focus:ring dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    placeholder="Add group description"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingDesc(false)}
                          className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleSaveDescription();
                          }}
                          className="rounded-md bg-cyan-600 px-2 py-1 text-xs font-semibold text-white hover:bg-cyan-700"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="rounded-lg bg-white/60 px-2.5 py-1.5 text-xs text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                      {groupDescription || "No description yet"}
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            {isGroup ? (
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMembers((prev) => !prev)}
                  className="rounded-full border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition duration-150 hover:scale-105 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  title="Add members"
                >
                  <UserPlus size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsMuted((prev) => !prev)}
                  className={`rounded-full border p-2 shadow-sm transition duration-150 hover:scale-105 ${
                    isMuted
                      ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  }`}
                  title={isMuted ? "Unmute notifications" : "Mute notifications"}
                >
                  <BellOff size={15} />
                </button>
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingDesc((prev) => !prev)}
                    className="rounded-full border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition duration-150 hover:scale-105 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    title="Edit group"
                  >
                    <Edit3 size={15} />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="thin-scrollbar flex-1 min-h-0 overflow-y-auto px-5 py-4">
            {uiNotice ? (
              <div className="mb-3 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-700 dark:border-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200">
                {uiNotice}
              </div>
            ) : null}

            {isGroup ? (
              <div className="mb-5">
                <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t(language, "members")}</h4>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    {memberCount}
                  </span>
                </div>

                <div className="relative mb-3">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t(language, "searchMembers")}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs shadow-sm outline-none ring-cyan-200 focus:ring dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                {showAddMembers && isAdmin ? (
                  <div className="mb-3 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                    <div className="thin-scrollbar max-h-36 space-y-1 overflow-y-auto">
                      {addableUsers.length === 0 ? (
                        <p className="px-1 py-1 text-xs text-slate-500 dark:text-slate-400">{t(language, "noUsersFound")}</p>
                      ) : (
                        addableUsers.map((user) => (
                          <label
                            key={user._id}
                            className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <input
                              type="checkbox"
                              checked={selectedMemberIds.includes(user._id)}
                              onChange={() => handleToggleCandidate(user._id)}
                            />
                            <span className="text-xs text-slate-700 dark:text-slate-200">{user.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleConfirmAddMembers}
                      disabled={selectedMemberIds.length === 0 || managingGroup}
                      className="mt-2 w-full rounded-md bg-blue-500 px-2 py-1.5 text-xs font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {managingGroup ? t(language, "creating") : t(language, "addMembers")}
                    </button>
                  </div>
                ) : null}

                <div className="space-y-1">
                  {filteredMembers.map((member) => {
                    const canRemove = isAdmin && String(member._id) !== String(selectedChat.admin?._id || selectedChat.admin);
                    const memberId = String(member._id);
                    const isMemberOnline = onlineUsers?.includes(memberId);
                    const isMemberAdmin =
                      member.role === "admin" ||
                      String(member._id) === String(selectedChat.admin?._id || selectedChat.admin);

                    return (
                      <div
                        key={member._id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 px-2 py-2 transition duration-150 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/70"
                      >
                        <button
                          type="button"
                          onClick={() => onOpenPersonalChat(member)}
                          className="min-w-0 flex flex-1 items-center gap-2 text-left"
                        >
                          <UserAvatar
                            userId={member._id}
                            name={member.name}
                            src={member.profilePic}
                            sizeClass="h-9 w-9"
                            textClass="text-xs"
                            showOnline
                            isOnline={Boolean(isMemberOnline)}
                          />
                          <span className="min-w-0">
                            <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-100">
                              {member.name}
                            </p>
                            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{member.email}</p>
                            <p className="truncate text-[10px] text-slate-400 dark:text-slate-500">{formatLastActive(member)}</p>
                          </span>
                        </button>

                        <div className="ml-2 flex items-center gap-1">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              isMemberAdmin
                                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {isMemberAdmin ? "Admin" : "Member"}
                          </span>

                          {isAdmin ? (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenMemberMenuId((prev) => (prev === memberId ? "" : memberId))
                                }
                                className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                                title="Member actions"
                              >
                                <MoreVertical size={14} />
                              </button>

                              {openMemberMenuId === memberId ? (
                                <div className="absolute right-0 top-7 z-20 min-w-32 rounded-lg border border-slate-200 bg-white p-1 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMemberMenuId("");
                                      onOpenPersonalChat(member);
                                    }}
                                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                                  >
                                    <ShieldCheck size={12} />
                                    View profile
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMemberMenuId("");
                                      handleMakeAdmin(member._id);
                                    }}
                                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                                  >
                                    <ShieldCheck size={12} />
                                    Make admin
                                  </button>
                                  {canRemove ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMemberMenuId("");
                                        onRemoveMember(selectedChat._id, member._id);
                                      }}
                                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                    >
                                      <X size={12} />
                                      Remove user
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => onExitGroup(selectedChat._id)}
                    disabled={managingGroup}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2 py-2 text-xs font-semibold text-red-700 transition duration-150 hover:scale-[1.01] hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                  >
                    <LogOut size={14} />
                    {t(language, "exitGroup")}
                  </button>
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => onDeleteGroup(selectedChat._id)}
                      disabled={managingGroup}
                      className="inline-flex items-center justify-center gap-1 rounded-xl bg-red-500 px-2 py-2 text-xs font-semibold text-white transition duration-150 hover:scale-[1.01] hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 size={14} />
                      {t(language, "deleteGroup")}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            <h4 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">{t(language, "sharedMedia") || "Shared media"}</h4>
            {imageMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-7 text-center dark:border-slate-700">
                <ImageIcon size={20} className="mb-2 text-slate-400 dark:text-slate-500" />
                <p className="text-xs text-slate-500 dark:text-slate-400">{t(language, "noMediaYet")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {imageMessages.map((msg) => (
                  <img
                    key={msg._id}
                    src={msg.image}
                    alt="Shared media"
                    onClick={() => setPreviewImage(msg.image)}
                    className="h-20 w-full cursor-zoom-in rounded-lg object-cover transition duration-200 hover:scale-[1.03]"
                  />
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500 dark:text-slate-400">
          {t(language, "userInfoPlaceholder")}
        </div>
      )}

      {previewImage ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setPreviewImage("")}
        >
          <button
            type="button"
            onClick={() => setPreviewImage("")}
            className="absolute right-5 top-5 rounded-full bg-white/90 p-2 text-slate-700 transition hover:bg-white"
            aria-label="Close image preview"
          >
            <X size={18} />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-h-[88vh] w-auto max-w-[92vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </aside>
  );
};

export default InfoPanel;
