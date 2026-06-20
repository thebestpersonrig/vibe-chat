"use client";

import { motion } from "framer-motion";
import { User } from "@/lib/types";
import Avatar from "@/components/Avatar";

interface UserProfileCardProps {
  user: User;
  onClose: () => void;
  onStartDm: (username: string) => void;
  currentUser: string;
  isOnline?: boolean;
}

function lastSeenAgo(dateString?: string | null): string {
  if (!dateString) return "unknown";
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function UserProfileCard({ user, onClose, onStartDm, currentUser, isOnline }: UserProfileCardProps) {
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
      transition={{ duration: 0.2 }}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
        animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
        exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-black/60"
      />
      <motion.div
        initial={{ scale: 0.3, opacity: 0, y: 60, rotateX: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
        exit={{ scale: 0.5, opacity: 0, y: 40, rotateX: 10 }}
        transition={{ type: "spring", stiffness: 350, damping: 25, mass: 0.8 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xs glass-strong rounded-2xl glow-strong border border-border overflow-hidden"
        style={{ perspective: "1000px" }}
      >
        <motion.div
          className="h-24 relative overflow-hidden"
          style={
            user.banner_url?.startsWith("linear-gradient")
              ? { background: user.banner_url }
              : user.banner_url
              ? { backgroundImage: `url(${user.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" }
              : { background: `linear-gradient(135deg, ${user.avatar_color}30, ${user.avatar_color}10, rgba(236,72,153,0.15))` }
          }
        >
          {!user.banner_url && (
            <motion.div
              className="absolute inset-0"
              animate={{
                background: [
                  `linear-gradient(135deg, ${user.avatar_color}30, transparent)`,
                  `linear-gradient(225deg, ${user.avatar_color}20, transparent)`,
                  `linear-gradient(135deg, ${user.avatar_color}30, transparent)`,
                ],
              }}
              transition={{ duration: 4, repeat: Infinity }}
            />
          )}
          <motion.div
            className="absolute -bottom-6 left-1/2 -translate-x-1/2"
            initial={{ y: -30, scale: 0 }}
            animate={{ y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.15 }}
          >
            <Avatar username={user.username} avatarColor={user.avatar_color} avatarUrl={user.avatar_url} size="lg" />
          </motion.div>
        </motion.div>

        <div className="pt-10 pb-5 px-5 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
            className="flex items-center justify-center gap-1.5 flex-wrap mb-1"
          >
            <h3 className="text-base font-bold" style={{ color: user.avatar_color }}>{user.username}</h3>
            {user.is_admin && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, delay: 0.3 }}
                className="text-[9px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full font-bold"
              >
                ADMIN
              </motion.span>
            )}
          </motion.div>

          {user.title && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 }}
              className="text-[11px] bg-accent/10 text-accent/70 px-2 py-0.5 rounded-full border border-accent/15 font-medium inline-block"
            >
              {user.title}
            </motion.span>
          )}
          {user.status_emoji && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-xs text-muted/60 mt-1"
            >
              {user.status_emoji} {user.status_text || ""}
            </motion.p>
          )}

          {user.bio && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xs text-muted/80 mt-2.5 px-2 leading-relaxed"
            >
              {user.bio}
            </motion.p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4 flex justify-center"
          >
            <div className="text-center">
              <motion.span
                className="text-lg block"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, delay: 0.5, repeat: Infinity, repeatDelay: 3 }}
              >
                📅
              </motion.span>
              <span className="text-xs text-muted">Joined {joinDate}</span>
              <div className="flex items-center gap-1 mt-1 justify-center">
                <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald" : "bg-muted/30"}`} />
                <span className="text-[10px] text-muted/60">
                  {isOnline ? "Online" : `Last seen ${lastSeenAgo(user.last_seen_at)}`}
                </span>
              </div>
            </div>
          </motion.div>

          {user.username !== currentUser && (
            <motion.button
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, type: "spring", stiffness: 300 }}
              onClick={() => { onStartDm(user.username); onClose(); }}
              whileHover={{ scale: 1.03, boxShadow: "0 0 20px rgba(139,92,246,0.2)" }}
              whileTap={{ scale: 0.97 }}
              className="w-full mt-4 text-xs bg-accent/15 hover:bg-accent/25 text-accent py-2.5 rounded-xl cursor-pointer transition-colors font-medium border border-accent/20 btn-glow"
            >
              Send Message
            </motion.button>
          )}
        </div>

        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
          onClick={onClose}
          whileHover={{ scale: 1.15, rotate: 90 }}
          whileTap={{ scale: 0.85 }}
          className="absolute top-2 right-2 text-white/40 hover:text-white transition-colors cursor-pointer text-sm w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10"
        >
          ✕
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
