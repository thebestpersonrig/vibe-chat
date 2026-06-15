"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Message as MessageType, Reaction, REACTION_EMOJIS } from "@/lib/types";

interface MessageProps {
  message: MessageType;
  isOwn: boolean;
  username: string;
}

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 10) return "now";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function groupReactions(reactions: Reaction[]): { emoji: string; users: string[]; count: number }[] {
  const map = new Map<string, string[]>();
  for (const r of reactions) {
    const list = map.get(r.emoji) || [];
    list.push(r.username);
    map.set(r.emoji, list);
  }
  return Array.from(map.entries()).map(([emoji, users]) => ({
    emoji,
    users,
    count: users.length,
  }));
}

export default function Message({ message, isOwn, username }: MessageProps) {
  const [showReactions, setShowReactions] = useState(false);
  const grouped = groupReactions(message.reactions || []);

  async function toggleReaction(emoji: string) {
    const existing = (message.reactions || []).find(
      (r) => r.emoji === emoji && r.username === username
    );

    if (existing) {
      await supabase.from("reactions").delete().eq("id", existing.id);
    } else {
      await supabase
        .from("reactions")
        .insert({ message_id: message.id, username, emoji });
    }
    setShowReactions(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`group flex gap-3 px-4 py-1.5 hover:bg-surface-hover/30 transition-colors ${
        isOwn ? "" : ""
      }`}
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
        style={{ backgroundColor: message.avatar_color }}
      >
        {message.username[0].toUpperCase()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span
            className="text-sm font-semibold"
            style={{ color: message.avatar_color }}
          >
            {message.username}
          </span>
          <span className="text-[10px] text-muted/50">{timeAgo(message.created_at)}</span>
        </div>
        <p className="text-sm text-foreground/90 break-words leading-relaxed">
          {message.content}
        </p>

        {/* Reactions */}
        {grouped.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {grouped.map(({ emoji, users, count }) => {
              const hasReacted = users.includes(username);
              return (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(emoji)}
                  className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
                    hasReacted
                      ? "bg-accent/20 border border-accent/40"
                      : "bg-surface border border-border hover:border-border-bright"
                  }`}
                >
                  <span>{emoji}</span>
                  <span className={hasReacted ? "text-accent" : "text-muted"}>{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Reaction trigger */}
      <div className="relative shrink-0 self-center">
        <button
          onClick={() => setShowReactions(!showReactions)}
          className="opacity-0 group-hover:opacity-100 text-muted hover:text-foreground text-sm transition-all cursor-pointer p-1 hover:bg-surface rounded"
        >
          😊
        </button>
        <AnimatePresence>
          {showReactions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute right-0 bottom-full mb-1 glass rounded-xl p-2 flex gap-1 z-10"
            >
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(emoji)}
                  className="text-base hover:scale-125 transition-transform cursor-pointer p-0.5"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
