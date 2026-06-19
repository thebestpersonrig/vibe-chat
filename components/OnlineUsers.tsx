"use client";

import { motion, AnimatePresence } from "framer-motion";
import { UserPresence, User } from "@/lib/types";
import Avatar from "@/components/Avatar";

interface OnlineUsersProps {
  users: UserPresence[];
  allUsers?: User[];
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function OnlineUsers({ users, allUsers = [] }: OnlineUsersProps) {
  const onlineSet = new Set(users.map((u) => u.username));
  const offlineUsers = allUsers.filter((u) => !onlineSet.has(u.username) && !u.is_banned);

  return (
    <div className="w-56 h-full glass-strong flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="p-4 border-b border-border relative"
      >
        <div className="absolute bottom-0 left-0 right-0 glow-line" />
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 bg-emerald rounded-full"
            animate={{
              boxShadow: ["0 0 0 0 rgba(16,185,129,0.6)", "0 0 0 5px rgba(16,185,129,0)", "0 0 0 0 rgba(16,185,129,0.6)"],
              scale: [1, 1.2, 1],
            }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
          <span className="text-[10px] font-bold text-muted/60 uppercase tracking-[0.15em]">
            Online — {users.length}
          </span>
        </div>
      </motion.div>
      <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
        <AnimatePresence mode="popLayout">
          {users.map((user, i) => (
            <motion.div
              key={user.username}
              initial={{ opacity: 0, x: 30, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -30, scale: 0.8 }}
              transition={{
                delay: i * 0.06,
                type: "spring",
                stiffness: 350,
                damping: 25,
              }}
              whileHover={{
                x: 4,
                backgroundColor: "rgba(139, 92, 246, 0.05)",
                transition: { duration: 0.2 },
              }}
              layout
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all group cursor-default"
            >
              <motion.div whileHover={{ scale: 1.15, rotate: 5 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                <Avatar username={user.username} avatarColor={user.avatar_color} avatarUrl={user.avatar_url} size="sm" showStatus />
              </motion.div>
              <div className="min-w-0 flex-1">
                <span className="text-xs text-foreground/70 group-hover:text-foreground truncate block transition-colors">{user.username}</span>
                {(() => { const u = allUsers.find(a => a.username === user.username); return u?.status_emoji ? <span className="text-[9px] text-muted/50 truncate block">{u.status_emoji} {u.status_text || ""}</span> : null; })()}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {offlineUsers.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-3 pb-1 px-1">
              <span className="text-[10px] font-bold text-muted/40 uppercase tracking-[0.15em]">
                Offline — {offlineUsers.length}
              </span>
            </div>
            {offlineUsers.map((user, i) => (
              <motion.div
                key={user.username}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl opacity-50 hover:opacity-70 transition-all cursor-default"
              >
                <Avatar username={user.username} avatarColor={user.avatar_color} avatarUrl={user.avatar_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-foreground/50 truncate block">{user.username}</span>
                  {user.last_seen_at && (
                    <span className="text-[9px] text-muted/40 truncate block">{timeAgo(user.last_seen_at)}</span>
                  )}
                </div>
              </motion.div>
            ))}
          </>
        )}

        {users.length === 0 && offlineUsers.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center justify-center py-8"
          >
            <motion.span
              className="text-2xl mb-2 inline-block"
              animate={{
                y: [0, -10, 0],
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              👻
            </motion.span>
            <p className="text-muted/30 text-xs text-center">Nobody here yet</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
