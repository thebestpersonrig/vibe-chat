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
      initial={{ opacity: 0, scale: 0.85, x: -20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.85, x: -20 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="flex items-center gap-2 flex-1"
    >
      <motion.div
        className="w-2.5 h-2.5 bg-red-500 rounded-full"
        animate={{
          scale: [1, 1.4, 1],
          boxShadow: [
            "0 0 0px rgba(239,68,68,0.3)",
            "0 0 12px rgba(239,68,68,0.7)",
            "0 0 0px rgba(239,68,68,0.3)",
          ],
        }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        className="text-xs text-red-400 font-mono"
        key={elapsed}
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
      >
        {fmt(elapsed)}
      </motion.span>
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden relative">
        <motion.div
          className="absolute inset-0 h-full bg-gradient-to-r from-red-500/70 via-pink/50 to-red-500/70"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="h-full bg-red-500/40 relative z-10"
          animate={{ width: ["0%", "100%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <motion.button
        onClick={cancel}
        whileHover={{ scale: 1.08, color: "var(--color-foreground)" }}
        whileTap={{ scale: 0.9 }}
        className="text-[10px] text-muted hover:text-foreground px-2 py-1 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"
      >
        Cancel
      </motion.button>
      <motion.button
        onClick={stopAndSend}
        whileHover={{
          scale: 1.08,
          boxShadow: "0 0 20px rgba(139,92,246,0.4), 0 0 40px rgba(236,72,153,0.2)",
        }}
        whileTap={{ scale: 0.9 }}
        className="text-[10px] bg-gradient-to-r from-accent to-pink text-white px-3 py-1.5 rounded-lg cursor-pointer font-medium btn-glow"
      >
        Send
      </motion.button>
    </motion.div>
  );
}
