import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

const formatDuration = (seconds) => {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const AudioMessageBubble = ({ src, duration = 0, isMine = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  const totalDuration = useMemo(() => {
    if (duration) return Number(duration);
    return audioRef.current?.duration || 0;
  }, [duration]);

  const progress = totalDuration > 0 ? Math.min((currentTime / totalDuration) * 100, 100) : 0;

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  return (
    <div
      className={`max-w-[260px] min-w-[220px] rounded-2xl p-3 shadow-md ${
        isMine
          ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
          : "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100"
      }`}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime || 0)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onLoadedMetadata={(e) => {
          if (!duration) {
            setCurrentTime(0);
          }
          if (!Number.isFinite(e.currentTarget.duration)) return;
        }}
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={togglePlay}
          className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
            isMine
              ? "bg-white/20 hover:bg-white/30"
              : "bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500"
          }`}
          aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <div className="flex-1">
          <div
            className={`h-1.5 w-full overflow-hidden rounded-full ${
              isMine ? "bg-white/30" : "bg-slate-300/60 dark:bg-slate-500/60"
            }`}
          >
            <div
              className={`h-full rounded-full ${isMine ? "bg-white" : "bg-blue-500"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className={`mt-1 flex justify-end text-[10px] ${isMine ? "text-white/80" : "opacity-80"}`}>
            {formatDuration(isPlaying ? currentTime : totalDuration || duration)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioMessageBubble;
