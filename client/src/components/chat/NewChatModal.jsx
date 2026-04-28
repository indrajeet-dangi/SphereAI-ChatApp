import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, Users, X } from "lucide-react";
import { t } from "../../i18n";
import UserAvatar from "./UserAvatar";

const NewChatModal = ({
  open,
  users,
  loading,
  onClose,
  onSelectUser,
  onCreateGroup,
  language = "en",
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupImageFile, setGroupImageFile] = useState(null);
  const [groupImagePreview, setGroupImagePreview] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const searchInputRef = useRef(null);
  const previewUrlRef = useRef("");

  useEffect(() => {
    if (!open) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = "";
      }
      setSearchTerm("");
      setCreatingGroup(false);
      setGroupName("");
      setGroupImageFile(null);
      setGroupImagePreview("");
      setSelectedMemberIds([]);
      return;
    }

    setSearchTerm("");
    setCreatingGroup(false);
    setGroupName("");
    setGroupImageFile(null);
    setGroupImagePreview("");
    setSelectedMemberIds([]);
    setTimeout(() => searchInputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = "";
      }
    };
  }, []);

  const filteredUsers = useMemo(
    () =>
      users.filter((user) =>
        String(user?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [users, searchTerm]
  );

  const toggleMember = (userId) => {
    setSelectedMemberIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMemberIds.length === 0) return;

    try {
      setSubmitting(true);
      let groupPic = "";

      if (groupImageFile) {
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
        if (!cloudName || !uploadPreset) {
          throw new Error("Cloudinary config is missing");
        }

        const formData = new FormData();
        formData.append("file", groupImageFile);
        formData.append("upload_preset", uploadPreset);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload group image");
        }

        const uploadData = await response.json();
        groupPic = uploadData.secure_url || "";
      }

      await onCreateGroup({
        name: groupName.trim(),
        members: selectedMemberIds,
        groupPic,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const onGroupImageChange = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const nextPreview = URL.createObjectURL(file);
    previewUrlRef.current = nextPreview;
    setGroupImageFile(file);
    setGroupImagePreview(nextPreview);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition hover:bg-gray-200 dark:hover:bg-slate-700"
            aria-label="Back"
            title={t(language, "back")}
          >
            <ArrowLeft size={20} className="text-slate-700 dark:text-slate-200" />
          </button>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {creatingGroup ? t(language, "createGroup") : t(language, "newChat")}
          </h3>
          <button
            type="button"
            onClick={() => setCreatingGroup((prev) => !prev)}
            className="rounded-full p-2 text-slate-700 transition hover:bg-gray-200 dark:text-slate-200 dark:hover:bg-slate-700"
            aria-label="Toggle group create"
            title={t(language, "createGroup")}
          >
            <Users size={18} />
          </button>
        </div>

        <div className="relative border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <input
            ref={searchInputRef}
            type="text"
            placeholder={creatingGroup ? t(language, "searchMembers") : t(language, "searchUsers")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm outline-none ring-cyan-200 focus:ring dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
          />
          {searchTerm ? (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-7 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
              aria-label="Clear user search"
                title={t(language, "close")}
            >
              <X size={16} />
            </button>
          ) : null}
        </div>

        {creatingGroup ? (
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <div className="mb-3 flex items-center gap-3">
              <img
                src={groupImagePreview || "https://via.placeholder.com/48x48?text=G"}
                alt="Group preview"
                className="h-12 w-12 rounded-full object-cover"
              />
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                <ImagePlus size={14} />
                Group Image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onGroupImageChange(e.target.files?.[0])}
                />
              </label>
            </div>
            <input
              type="text"
              placeholder={t(language, "createGroupNamePlaceholder")}
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-200 focus:ring dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={handleCreateGroup}
              disabled={submitting || !groupName.trim() || selectedMemberIds.length === 0}
              className="mt-2 w-full rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? t(language, "creating") : t(language, "createGroup")}
            </button>
          </div>
        ) : null}

        <div className="max-h-[400px] overflow-y-auto">
          {loading ? <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{t(language, "loadingUsers")}</p> : null}

          {!loading && users.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{t(language, "noUsersAvailable")}</p>
          ) : null}

          {!loading && users.length > 0 && filteredUsers.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{t(language, "noUsersFound")}</p>
          ) : null}

          {filteredUsers.map((user) => {
            const checked = selectedMemberIds.includes(user._id);
            const avatarSrc = user?.profilePic || user?.photoURL || user?.avatar || "";

            return (
              <button
                key={user._id}
                type="button"
                onClick={() => (creatingGroup ? toggleMember(user._id) : onSelectUser(user))}
                className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
              >
                <UserAvatar
                  name={user?.name}
                  src={avatarSrc}
                  sizeClass="h-10 w-10"
                  textClass="text-sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                </div>
                {creatingGroup ? (
                  <input
                    type="checkbox"
                    readOnly
                    checked={checked}
                    className="h-4 w-4 rounded border-slate-300 text-blue-500"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;
