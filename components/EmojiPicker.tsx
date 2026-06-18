"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { CustomEmoji } from "@/lib/types";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  customEmojis?: CustomEmoji[];
}

const EMOJIS: Record<string, string[]> = {
  "😀": ["😀", "😂", "🤣", "😊", "😍", "🥰", "😎", "🤔", "😏", "🥺", "😤", "😭", "🤯", "🫡", "😴", "🥳", "😈", "🤡", "💀", "👻", "🤖", "😅", "🙂", "😜"],
  "👋": ["👍", "👎", "👋", "✌️", "🤝", "🙏", "💪", "👀", "🫶", "🤙", "✊", "👏", "🤞", "🫵", "💅", "🤌", "🤘", "🖐️"],
  "❤️": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💕", "💖", "💗", "💝", "💔", "❤️‍🔥", "❤️‍🩹"],
  "🔥": ["🔥", "⚡", "💯", "🎉", "🎯", "🚀", "💡", "⭐", "✨", "🏆", "💎", "🎵", "🌈", "☀️", "🌙", "💫", "🍀", "🎮"],
  "🍕": ["🍕", "🍔", "🍟", "🌮", "🍩", "☕", "🍿", "🧁", "🍰", "🍎", "🍗", "🥤", "🍺", "🧃"],
};

const BASE_TABS = Object.keys(EMOJIS);

export default function EmojiPicker({ onSelect, onClose, customEmojis }: EmojiPickerProps) {
  const hasCustom = customEmojis && customEmojis.length > 0;
  const tabs = hasCustom ? [...BASE_TABS, "⭐"] : BASE_TABS;
  const [activeTab, setActiveTab] = useState(BASE_TABS[0]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const isCustomTab = activeTab === "⭐";

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute bottom-full mb-2 left-0 w-72 glass-strong rounded-2xl overflow-hidden z-30 glow"
    >
      <div className="flex gap-0.5 p-1.5 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-base p-1.5 rounded-lg transition-all cursor-pointer ${activeTab === tab ? "bg-accent/20 scale-110" : "hover:bg-surface-hover"}`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="p-2 h-48 overflow-y-auto">
        {isCustomTab && customEmojis ? (
          <div className="grid grid-cols-6 gap-1">
            {customEmojis.map((ce) => (
              <motion.button
                key={ce.id}
                onClick={() => onSelect(`:${ce.name}:`)}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.8 }}
                className="p-1 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors flex items-center justify-center"
                title={`:${ce.name}:`}
              >
                <img src={ce.url} alt={ce.name} className="w-7 h-7 object-contain" />
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-0.5">
            {(EMOJIS[activeTab] || []).map((emoji) => (
              <motion.button
                key={emoji}
                onClick={() => onSelect(emoji)}
                whileHover={{ scale: 1.3 }}
                whileTap={{ scale: 0.8 }}
                className="text-lg p-1 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors text-center"
              >
                {emoji}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
