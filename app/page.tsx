"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AVATAR_COLORS } from "@/lib/types";

export default function Home() {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("vibe-chat-user");
    if (saved) {
      router.push("/chat");
    }
  }, [router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = username.trim();
    if (trimmed.length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    if (trimmed.length > 20) {
      setError("Name must be 20 characters or less");
      return;
    }

    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    localStorage.setItem(
      "vibe-chat-user",
      JSON.stringify({ username: trimmed, avatarColor: color })
    );
    router.push("/chat");
  }

  return (
    <div className="h-full flex items-center justify-center relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[120px]"
          style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899)", top: "-10%", left: "-10%" }}
          animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full opacity-15 blur-[100px]"
          style={{ background: "linear-gradient(135deg, #3B82F6, #06B6D4)", bottom: "-10%", right: "-10%" }}
          animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[300px] h-[300px] rounded-full opacity-10 blur-[80px]"
          style={{ background: "linear-gradient(135deg, #F59E0B, #EF4444)", top: "50%", left: "50%" }}
          animate={{ x: [0, 40, -40, 0], y: [0, -40, 40, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="text-center mb-8">
          <motion.div
            className="text-6xl mb-4 inline-block"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            💬
          </motion.div>
          <h1 className="text-4xl font-bold gradient-text mb-2">Vibe Chat</h1>
          <p className="text-muted text-sm">Real-time group chat with vibes</p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 glow">
          <label htmlFor="username" className="block text-sm font-medium text-muted mb-2">
            What should we call you?
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError("");
            }}
            placeholder="Enter your name..."
            autoFocus
            maxLength={20}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
          />
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-sm mt-2"
            >
              {error}
            </motion.p>
          )}
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full mt-4 bg-accent hover:bg-accent-hover text-white font-medium py-3 rounded-xl transition-colors cursor-pointer"
          >
            Start Chatting →
          </motion.button>
        </form>

        <p className="text-center text-muted/40 text-xs mt-6">
          No account needed — just pick a name and go
        </p>
      </motion.div>
    </div>
  );
}
