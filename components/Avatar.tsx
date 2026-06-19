"use client";

import { motion } from "framer-motion";

interface AvatarProps {
  username: string;
  avatarColor: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
  className?: string;
}

const sizes = {
  sm: "w-7 h-7 text-[10px]",
  md: "w-9 h-9 text-xs",
  lg: "w-12 h-12 text-sm",
};

export default function Avatar({ username, avatarColor, avatarUrl, size = "md", showStatus, className = "" }: AvatarProps) {
  return (
    <div className={`relative shrink-0 ${className}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={username}
          className={`${sizes[size]} rounded-full object-cover ring-2 ring-white/5 hover:ring-accent/30 transition-all duration-300 avatar-glow-ring`}
          style={{ "--avatar-glow": `${avatarColor}40` } as React.CSSProperties}
        />
      ) : (
        <div
          className={`${sizes[size]} rounded-full flex items-center justify-center text-white font-bold ring-2 ring-white/5 hover:ring-accent/30 transition-all duration-300 avatar-glow-ring`}
          style={{
            backgroundColor: avatarColor,
            boxShadow: `0 2px 10px ${avatarColor}33`,
            "--avatar-glow": `${avatarColor}40`,
          } as React.CSSProperties}
        >
          {username[0].toUpperCase()}
        </div>
      )}
      {showStatus && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.2 }}
          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald rounded-full border-2 border-surface online-pulse"
        />
      )}
    </div>
  );
}
