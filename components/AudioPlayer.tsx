"use client";

import { useState, useRef } from "react";

export default function AudioPlayer({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play();
    else audio.pause();
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio) return;
    setProgress(audio.currentTime);
    setDuration(audio.duration || 0);
  }

  function handleEnded() {
    setPlaying(false);
    setProgress(0);
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * duration;
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <div className="flex items-center gap-3 bg-surface/80 border border-border rounded-2xl px-4 py-2.5 max-w-xs mt-1.5">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleTimeUpdate}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        preload="metadata"
      />
      <button
        onClick={toggle}
        className="text-accent hover:text-accent-hover transition-colors cursor-pointer text-lg shrink-0"
      >
        {playing ? "⏸" : "▶️"}
      </button>
      <div className="flex-1 min-w-0">
        <div onClick={seek} className="h-1.5 bg-border rounded-full cursor-pointer relative overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-pink rounded-full transition-all"
            style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-muted/50">{fmt(progress)}</span>
          <span className="text-[9px] text-muted/50">{duration ? fmt(duration) : "0:00"}</span>
        </div>
      </div>
      <span className="text-xs text-muted/40">🎤</span>
    </div>
  );
}
