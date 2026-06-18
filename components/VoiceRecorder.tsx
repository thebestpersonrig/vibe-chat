"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface VoiceRecorderProps {
  onSend: (blob: Blob) => void;
  onCancel: () => void;
}

export default function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        chunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        timerRef.current = setInterval(() => setElapsed((t) => t + 1), 1000);
      } catch {
        onCancel();
      }
    })();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = () => {
          recorder.stream.getTracks().forEach((t) => t.stop());
        };
        recorder.stop();
      }
    };
  }, [onCancel]);

  function stopAndSend() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recorder.onstop = () => {
      recorder.stream.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      onSend(blob);
    };
    recorder.stop();
  }

  function cancel() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
      };
      recorder.stop();
    }
    onCancel();
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 flex-1"
    >
      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      <span className="text-xs text-red-400 font-mono">{fmt(elapsed)}</span>
      <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-red-500/60"
          animate={{ width: ["0%", "100%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <button
        onClick={cancel}
        className="text-[10px] text-muted hover:text-foreground px-2 py-1 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"
      >
        Cancel
      </button>
      <motion.button
        onClick={stopAndSend}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="text-[10px] bg-gradient-to-r from-accent to-pink text-white px-3 py-1.5 rounded-lg cursor-pointer font-medium"
      >
        Send
      </motion.button>
    </motion.div>
  );
}
