import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { AI_USER } from "../../constants/aiUser";

const PALETTE = [
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-lime-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-sky-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-fuchsia-500",
];

const hashString = (value = "") => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

const getInitial = (name = "") => {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "U";
  return trimmed.charAt(0).toUpperCase();
};

const buildFallbackAvatar = (name = "") => {
  const safeName = encodeURIComponent(String(name || "User"));
  return `https://ui-avatars.com/api/?name=${safeName}&background=random&color=fff&bold=true`;
};

const UserAvatar = ({
  userId = "",
  name,
  src,
  sizeClass = "h-10 w-10",
  textClass = "text-sm",
  showOnline = false,
  isOnline = false,
  isAI = false,
}) => {
  const isAIUser = Boolean(isAI) || String(userId) === String(AI_USER._id);
  const aiLogo = AI_USER.avatar || "/ai-logo.png";
  const fallbackAvatar = buildFallbackAvatar(name);
  const [imageSrc, setImageSrc] = useState(isAIUser ? aiLogo : src || fallbackAvatar);
  const [imageFailed, setImageFailed] = useState(false);
  const colorClass = PALETTE[hashString(name || "user") % PALETTE.length];

  useEffect(() => {
    setImageSrc(isAIUser ? aiLogo : src || fallbackAvatar);
    setImageFailed(false);
  }, [isAIUser, src, fallbackAvatar, aiLogo]);

  const shouldShowImage = Boolean(imageSrc) && !imageFailed;

  return (
    <div className={`relative shrink-0 ${sizeClass}`}>
      {shouldShowImage ? (
        <img
          src={imageSrc}
          alt={name || "User"}
          className={`h-full w-full rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700`}
          onError={() => {
            if (isAIUser) {
              setImageFailed(true);
              return;
            }
            if (imageSrc !== fallbackAvatar) {
              setImageSrc(fallbackAvatar);
              return;
            }
            setImageFailed(true);
          }}
        />
      ) : isAIUser ? (
        <div
          className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 via-sky-500 to-indigo-500 text-white shadow-md ring-2 ring-blue-500/50 dark:ring-cyan-700 ${textClass}`}
          aria-label={name || AI_USER.name}
        >
          <Bot size={18} />
        </div>
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center rounded-full ${colorClass} font-bold text-white ${textClass}`}
          aria-label={name || "User"}
        >
          {getInitial(name)}
        </div>
      )}

      {showOnline ? (
        <span
          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
            isOnline ? "bg-emerald-500" : "bg-slate-400 dark:bg-slate-600"
          }`}
        />
      ) : null}
    </div>
  );
};

export default UserAvatar;
