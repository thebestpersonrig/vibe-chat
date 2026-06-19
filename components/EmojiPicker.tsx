"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

const emojiVariants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.012,
      type: "spring" as const,
      stiffness: 500,
      damping: 25,
    },
  }),
};

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
      initial={{ opacity: 0, y: 15, scale: 0.9, rotateX: 5 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
      exit={{ opacity: 0, y: 15, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="absolute bottom-full mb-2 left-0 w-72 glass-strong rounded-2xl overflow-hidden z-30 glow"
    >
      <div className="flex gap-0.5 p-1.5 border-b border-border">
        {tabs.map((tab, i) => (
          <motion.button
            key={tab}
            onClick={() => setActiveTab(tab)}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, type: "spring", stiffness: 400 }}
            whileHover={{ scale: 1.15, y: -2 }}
            whileTap={{ scale: 0.85 }}
            className={`text-base p-1.5 rounded-lg transition-all cursor-pointer ${activeTab === tab ? "bg-accent/20 scale-110" : "hover:bg-surface-hover"}`}
          >
            {tab}
          </motion.button>
        ))}
      </div>
      <div className="p-2 h-48 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
          >
            {isCustomTab && customEmojis ? (
              <div className="grid grid-cols-6 gap-1">
                {customEmojis.map((ce, i) => (
                  <motion.button
                    key={ce.id}
                    custom={i}
                    variants={emojiVariants}
                    initial="hidden"
                    animate="visible"
                    onClick={() => onSelect(`:${ce.name}:`)}
                    whileHover={{ scale: 1.3, rotate: 10, y: -4 }}
                    whileTap={{ scale: 0.7, rotate: -10 }}
                    className="p-1 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors flex items-center justify-center"
                    title={`:${ce.name}:`}
                  >
                    <img src={ce.url} alt={ce.name} className="w-7 h-7 object-contain" />
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-8 gap-0.5">
                {(EMOJIS[activeTab] || []).map((emoji, i) => (
                  <motion.button
                    key={emoji}
                    custom={i}
                    variants={emojiVariants}
                    initial="hidden"
                    animate="visible"
                    onClick={() => onSelect(emoji)}
                    whileHover={{ scale: 1.4, rotate: 15, y: -5 }}
                    whileTap={{ scale: 0.6, rotate: -15 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    className="text-lg p-1 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors text-center"
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
