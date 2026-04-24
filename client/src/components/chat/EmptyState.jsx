import { Bot, MessageSquarePlus } from "lucide-react";
import { AI_USER } from "../../constants/aiUser";

const EmptyState = ({ onStartNewChat, onAskAI }) => {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-transparent px-6">
      <div className="pointer-events-none absolute h-[200px] w-[200px] rounded-full bg-blue-500/10 blur-[80px]" />
      <div className="relative w-full max-w-md text-center">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-indigo-500/20">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
          <div className="text-2xl font-semibold text-slate-400 dark:text-slate-500">+</div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#22d3ee,#6366f1)] shadow-[0_10px_30px_rgba(99,102,241,0.3)]">
            <img
              src={AI_USER.avatar}
              alt={AI_USER.name}
              className="h-8 w-8 rounded-full object-cover ring-2 ring-white/40"
            />
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-gray-700 dark:text-white/90">
          {AI_USER.name}
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-white/70">
          Smarter conversations. Powered by AI.
        </p>

        <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onStartNewChat}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition hover:scale-[1.02] hover:shadow-lg active:scale-[0.99]"
          >
            <MessageSquarePlus size={18} />
            Start New Chat
          </button>
          <button
            type="button"
            onClick={onAskAI}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#06b6d4,#3b82f6)] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/30 active:translate-y-0"
          >
            <Bot size={18} />
            Ask AI
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;
