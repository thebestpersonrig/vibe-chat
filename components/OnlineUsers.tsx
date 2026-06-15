"use client";

import { motion, AnimatePresence } from "framer-motion";
import { UserPresence } from "@/lib/types";

interface OnlineUsersProps {
  users: UserPresence[];
}

export default function OnlineUsers({ users }: OnlineUsersProps) {
  return (
    <div className="w-56 h-full border-l border-border glass flex flex-col">
      <div className="p-4 border-b border-border">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
          Online — {users.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <AnimatePresence>
          {users.map((user) => (
            <motion.div
              key={user.username}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg"
            >
              <div className="relative">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ backgroundColor: user.avatar_color }}
                >
                  {user.username[0].toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-surface" />
              </div>
              <span className="text-xs text-foreground/80 truncate">{user.username}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {users.length === 0 && (
          <p className="text-muted/40 text-xs text-center py-4">Nobody here yet</p>
        )}
      </div>
    </div>
  );
}
