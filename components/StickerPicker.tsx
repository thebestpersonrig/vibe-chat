"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface StickerPickerProps {
  onSelect: (sticker: string) => void;
  onClose: () => void;
  customStickers?: { id: string; name: string; url: string }[];
}

const STICKER_PACKS: Record<string, string[]> = {
  "😀 Faces": ["😀", "😂", "🥰", "😎", "🤯", "😭", "🥺", "😤", "💀", "👻", "🤡", "😈", "🫠", "🥶", "🤑", "😴"],
  "🐾 Animals": ["🐶", "🐱", "🐻", "🦊", "🐼", "🐨", "🦁", "🐮", "🐸", "🐧", "🦄", "🐙", "🦋", "🐝", "🐳", "🦖"],
  "👍 Reactions": ["👍", "👎", "❤️", "🔥", "💯", "🎉", "💪", "🤝", "🙏", "👏", "✨", "💫", "⚡", "🌟", "💖", "🫶"],
  "🍕 Food": ["🍕", "🍔", "🌮", "🍿", "🍩", "🎂", "🍦", "☕", "🧋", "🍷", "🍺", "🥤", "🍜", "🍣", "🥑", "🍪"],
};

export default function StickerPicker({ onSelect, onClose, customStickers }: StickerPickerProps) {
  const packs = Object.keys(STICKER_PACKS);
  if (customStickers && customStickers.length > 0) packs.push("⭐ Custom");
  const [activePack, setActivePack] = useState(packs[0]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const isCustom = activePack === "⭐ Custom";

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 15, scale: 0.85, rotateX: 5 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
      exit={{ opacity: 0, y: 15, scale: 0.85 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="absolute bottom-full mb-2 left-0 w-80 glass-strong rounded-2xl overflow-hidden z-30 glow"
    >
      <div className="flex gap-0.5 p-1.5 border-b border-border overflow-x-auto">
        {packs.map((pack) => (
          <button
            key={pack}
            onClick={() => setActivePack(pack)}
            className={`text-[10px] px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              activePack === pack ? "bg-accent/20 text-accent font-medium" : "text-muted hover:bg-surface-hover"
            }`}
          >
            {pack}
          </button>
        ))}
      </div>
      <div className="p-3 h-56 overflow-y-auto">
        <div className="grid grid-cols-4 gap-2">
          {isCustom && customStickers
            ? customStickers.map((s) => (
                <motion.button
                  key={s.id}
                  onClick={() => onSelect(`[sticker:${s.url}]`)}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.85 }}
                  className="p-1.5 rounded-xl hover:bg-surface-hover cursor-pointer transition-colors aspect-square flex items-center justify-center"
                  title={s.name}
                >
                  <img src={s.url} alt={s.name} className="w-12 h-12 object-contain" />
                </motion.button>
              ))
            : (STICKER_PACKS[activePack] || []).map((sticker) => (
                <motion.button
                  key={sticker}
                  onClick={() => onSelect(sticker)}
                  whileHover={{ scale: 1.3, rotate: [0, -8, 8, 0], y: -5 }}
                  whileTap={{ scale: 0.7, rotate: -15 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  className="text-4xl p-2 rounded-xl hover:bg-surface-hover cursor-pointer transition-colors text-center aspect-square flex items-center justify-center"
                >
                  {sticker}
                </motion.button>
              ))}
        </div>
      </div>
    </motion.div>
  );
}
