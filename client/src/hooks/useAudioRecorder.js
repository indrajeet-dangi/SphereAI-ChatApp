import { useEffect, useRef, useState } from "react";

const MAX_RECORDING_SECONDS = 120;

const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const cleanupStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetTimer = () => {
    stopTimer();
    setRecordingTime(0);
    setRecordedDuration(0);
  };

  const cancelRecording = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    } catch {
      // no-op
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setIsPreparing(false);
    setAudioBlob(null);
    setError("");
    resetTimer();
    cleanupStream();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl("");
    }
  };

  const startRecording = async () => {
    if (isRecording || isPreparing) return;

    try {
      setError("");
      setIsPreparing(true);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        setAudioBlob(blob);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(URL.createObjectURL(blob));
        setIsRecording(false);
        setIsPreparing(false);
        cleanupStream();
      };

      recorder.start();
      setIsRecording(true);
      setIsPreparing(false);
      setRecordingTime(0);
      setRecordedDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const next = prev + 1;
          if (next >= MAX_RECORDING_SECONDS) {
            try {
              if (mediaRecorderRef.current?.state !== "inactive") {
                mediaRecorderRef.current.stop();
              }
            } catch {
              // no-op
            }
          }
          return Math.min(next, MAX_RECORDING_SECONDS);
        });
      }, 1000);
    } catch (err) {
      setIsPreparing(false);
      setIsRecording(false);
      setError(err?.message || "Microphone permission denied");
      cleanupStream();
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;
    try {
      setRecordedDuration(recordingTime);
      mediaRecorderRef.current.stop();
    } catch {
      // no-op
    } finally {
      stopTimer();
    }
  };

  useEffect(() => {
    return () => {
      resetTimer();
      cleanupStream();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  return {
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
  };
};

export default useAudioRecorder;
