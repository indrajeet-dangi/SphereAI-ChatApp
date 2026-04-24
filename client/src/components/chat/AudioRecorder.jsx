import { useState } from "react";
import { Loader2, Mic, Send, Square, Trash2 } from "lucide-react";
import useAudioRecorder from "../../hooks/useAudioRecorder";

const formatDuration = (seconds) => {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const AudioRecorder = ({ disabled = false, onSend }) => {
  const {
    isRecording,
    isPreparing,
    audioBlob,
    audioUrl,
    recordingTime,
    recordedDuration,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecorder();
  const [sending, setSending] = useState(false);

  const handleSendAudio = async () => {
    if (!audioBlob || typeof onSend !== "function") return;
    setSending(true);
    try {
      await onSend(audioBlob, recordedDuration || recordingTime);
      cancelRecording();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {!audioBlob ? (
        <button
          type="button"
          disabled={disabled || isPreparing}
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={() => {
            if (isRecording) stopRecording();
          }}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          onTouchCancel={stopRecording}
          className={`rounded-full p-2 transition ${
            isRecording
              ? "bg-red-500 text-white animate-pulse"
              : "text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
          } disabled:cursor-not-allowed disabled:opacity-60`}
          title={isRecording ? "Recording..." : "Hold to record audio"}
          aria-label="Record voice message"
        >
          {isPreparing ? <Loader2 size={17} className="animate-spin" /> : <Mic size={17} />}
        </button>
      ) : null}

      {isRecording ? (
        <div className="flex items-center gap-2 rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span>Recording {formatDuration(recordingTime)}</span>
          <button
            type="button"
            onClick={stopRecording}
            className="rounded-full p-1 hover:bg-red-100 dark:hover:bg-red-900/40"
            aria-label="Stop recording"
          >
            <Square size={12} />
          </button>
        </div>
      ) : null}

      {!isRecording && audioBlob ? (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <audio controls src={audioUrl} className="h-8 max-w-[200px]" />
          <span className="text-[11px] text-slate-500 dark:text-slate-300">
            {formatDuration(recordedDuration || recordingTime)}
          </span>
          <button
            type="button"
            onClick={cancelRecording}
            disabled={sending}
            className="rounded-full p-1 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
            aria-label="Cancel voice message"
            title="Cancel"
          >
            <Trash2 size={14} />
          </button>
          <button
            type="button"
            onClick={handleSendAudio}
            disabled={sending}
            className="rounded-full bg-blue-500 p-2 text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Send voice message"
            title="Send"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      ) : null}

      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
};

export default AudioRecorder;
