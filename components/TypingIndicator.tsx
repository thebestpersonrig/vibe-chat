"use client";

import { motion, AnimatePresence } from "framer-motion";

interface TypingIndicatorProps {
  users: string[];
}

export default function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const text =
    users.length === 1
      ? `${users[0]} is typing`
      : users.length === 2
        ? `${users[0]} and ${users[1]} are typing`
        : `${users[0]} and ${users.length - 1} others are typing`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        className="flex items-center gap-2.5 px-5 py-2"
      >
        <div className="flex gap-1 bg-surface/60 rounded-full px-3 py-1.5 border border-border/50">
          <span className="typing-dot w-1.5 h-1.5 bg-accent rounded-full inline-block" />
          <span className="typing-dot w-1.5 h-1.5 bg-pink rounded-full inline-block" />
          <span className="typing-dot w-1.5 h-1.5 bg-blue rounded-full inline-block" />
        </div>
        <span className="text-xs text-muted/60 italic">{text}</span>
      </motion.div>
    </AnimatePresence>
  );
}
