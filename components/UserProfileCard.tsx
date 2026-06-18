"use client";

import { motion } from "framer-motion";
import { User } from "@/lib/types";
import Avatar from "@/components/Avatar";

interface UserProfileCardProps {
  user: User;
  onClose: () => void;
  onStartDm: (username: string) => void;
  currentUser: string;
}

export default function UserProfileCard({ user, onClose, onStartDm, currentUser }: UserProfileCardProps) {
  const joinDate = new Date(user.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xs glass-strong rounded-2xl glow-strong border border-border overflow-hidden"
      >
        <div className="h-16 bg-gradient-to-r from-accent/20 to-pink/20 relative">
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
            <Avatar username={user.username} avatarColor={user.avatar_color} avatarUrl={user.avatar_url} size="lg" />
          </div>
        </div>

        <div className="pt-10 pb-5 px-5 text-center">
          <div className="flex items-center justify-center gap-1.5 flex-wrap mb-1">
            <h3 className="text-base font-bold" style={{ color: user.avatar_color }}>{user.username}</h3>
            {user.is_admin && <span className="text-[9px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full font-bold">ADMIN</span>}
          </div>

          {user.title && (
            <span className="text-[11px] bg-accent/10 text-accent/70 px-2 py-0.5 rounded-full border border-accent/15 font-medium">{user.title}</span>
          )}
          {user.status_emoji && (
            <p className="text-xs text-muted/60 mt-1">{user.status_emoji} {user.status_text || ""}</p>
          )}

          <div className="mt-4 flex justify-center gap-6">
            <div className="text-center">
              <span className="text-lg block">💰</span>
              <span className="text-xs text-muted">{user.balance || 0}</span>
            </div>
            <div className="text-center">
              <span className="text-lg block">📅</span>
              <span className="text-xs text-muted">{joinDate}</span>
            </div>
          </div>

          {user.username !== currentUser && (
            <motion.button
              onClick={() => { onStartDm(user.username); onClose(); }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full mt-4 text-xs bg-accent/15 hover:bg-accent/25 text-accent py-2.5 rounded-xl cursor-pointer transition-colors font-medium border border-accent/20"
            >
              Send Message
            </motion.button>
          )}
        </div>

        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-white/40 hover:text-white transition-colors cursor-pointer text-sm w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10"
        >
          ✕
        </button>
      </motion.div>
    </motion.div>
  );
}
