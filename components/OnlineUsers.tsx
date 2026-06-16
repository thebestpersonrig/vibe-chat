"use client";

import { motion, AnimatePresence } from "framer-motion";
import { UserPresence } from "@/lib/types";

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
        <AnimatePresence>
          {users.map((user, i) => (
            <motion.div
              key={user.username}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-surface-hover/40 transition-all group"
            >
              <div className="relative">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-transparent group-hover:ring-accent/20 transition-all"
                  style={{ backgroundColor: user.avatar_color }}
                >
                  {user.username[0].toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald rounded-full border-2 border-surface online-pulse" />
              </div>
              <span className="text-xs text-foreground/70 group-hover:text-foreground truncate transition-colors">{user.username}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {users.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8">
            <span className="text-2xl mb-2">👻</span>
            <p className="text-muted/30 text-xs text-center">Nobody here yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
