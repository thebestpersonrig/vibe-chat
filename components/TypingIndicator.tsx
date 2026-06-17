"use client";

import { motion, AnimatePresence } from "framer-motion";

interface TypingIndicatorProps {
  users: string[];
}

export default function TypingIndicator({ users }: TypingIndicatorProps) {
  const text =
    users.length === 1
      ? `${users[0]} is typing`
      : users.length === 2
        ? `${users[0]} and ${users[1]} are typing`
        : users.length > 2
          ? `${users[0]} and ${users.length - 1} others are typing`
          : "";

  return (
    <div className="shrink-0 overflow-hidden">
      <AnimatePresence>
        {users.length > 0 && (
          <motion.div
            key="typing"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 32 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="flex items-center gap-2.5 px-5"
          >
            <div className="flex gap-1.5 bg-surface/60 rounded-full px-3 py-1.5 border border-border/50">
              <span className="typing-dot w-1.5 h-1.5 bg-accent rounded-full inline-block" />
              <span className="typing-dot w-1.5 h-1.5 bg-pink rounded-full inline-block" />
              <span className="typing-dot w-1.5 h-1.5 bg-blue rounded-full inline-block" />
            </div>
            <span className="text-xs text-muted/50 italic">{text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
