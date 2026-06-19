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
            initial={{ opacity: 0, height: 0, y: 10 }}
            animate={{ opacity: 1, height: 32, y: 0 }}
            exit={{ opacity: 0, height: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="flex items-center gap-2.5 px-5"
          >
            <motion.div
              className="flex gap-1.5 bg-surface/60 rounded-full px-3 py-1.5 border border-border/50"
              animate={{ boxShadow: ["0 0 0px rgba(139,92,246,0)", "0 0 12px rgba(139,92,246,0.15)", "0 0 0px rgba(139,92,246,0)"] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ backgroundColor: i === 0 ? "var(--color-accent)" : i === 1 ? "var(--color-pink)" : "var(--color-blue)" }}
                  animate={{
                    y: [0, -8, 2, 0],
                    scale: [1, 1.3, 0.9, 1],
                    opacity: [0.4, 1, 0.7, 0.4],
                  }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: [0.34, 1.56, 0.64, 1],
                  }}
                />
              ))}
            </motion.div>
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 300 }}
              className="text-xs text-muted/50 italic"
            >
              {text}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
