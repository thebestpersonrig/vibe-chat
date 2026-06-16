"use client";

import { motion, AnimatePresence } from "framer-motion";
import { UserPresence } from "@/lib/types";
import Avatar from "@/components/Avatar";

interface OnlineUsersProps {
  users: UserPresence[];
}

export default function OnlineUsers({ users }: OnlineUsersProps) {
  return (
    <div className="w-56 h-full glass-strong flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald rounded-full online-pulse" />
          <span className="text-[10px] font-bold text-muted/60 uppercase tracking-[0.15em]">
            Online — {users.length}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
        <AnimatePresence mode="popLayout">
          {users.map((user, i) => (
            <motion.div
              key={user.username}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.9 }}
              transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 25 }}
              layout
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-surface-hover/40 transition-all group cursor-default"
            >
              <Avatar username={user.username} avatarColor={user.avatar_color} avatarUrl={user.avatar_url} size="sm" showStatus />
              <span className="text-xs text-foreground/70 group-hover:text-foreground truncate transition-colors">{user.username}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {users.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8">
            <span className="text-2xl mb-2 gentle-float inline-block">👻</span>
            <p className="text-muted/30 text-xs text-center">Nobody here yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
