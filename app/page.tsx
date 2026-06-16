"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { AVATAR_COLORS } from "@/lib/types";
import { hashPassword } from "@/lib/auth";

function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: ["#8B5CF6", "#EC4899", "#3B82F6", "#06B6D4"][i % 4],
            opacity: Math.random() * 0.4 + 0.1,
          }}
          animate={{
            y: [0, -(Math.random() * 200 + 100)],
            x: [0, (Math.random() - 0.5) * 100],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: Math.random() * 8 + 6,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

export default function Home() {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [step, setStep] = useState<"username" | "password">("username");
  const [isNewUser, setIsNewUser] = useState(false);
  const [password, setPassword] = useState("");
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("rpb-user");
    if (saved) {
      router.push("/chat");
    }
  }, [router]);

  async function handleUsernameSubmit(e: React.FormEvent) {
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

    setChecking(true);
    setError("");

    const { data: existing } = await supabase
      .from("users")
      .select("*")
      .eq("username", trimmed)
      .single();

    setIsNewUser(!existing);
    setStep("password");
    setChecking(false);
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    setChecking(true);
    setError("");

    const trimmed = username.trim();
    const hashed = await hashPassword(password);

    if (isNewUser) {
      const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      const { error: insertErr } = await supabase
        .from("users")
        .insert({ username: trimmed, avatar_color: color, password_hash: hashed });

      if (insertErr) {
        if (insertErr.code === "23505") {
          setError("Username just got taken — try another");
          setStep("username");
        } else {
          setError("Something went wrong, try again");
        }
        setChecking(false);
        return;
      }

      localStorage.setItem("rpb-user", JSON.stringify({ username: trimmed, avatarColor: color, avatarUrl: null }));
      router.push("/chat");
    } else {
      const { data: existing } = await supabase
        .from("users")
        .select("*")
        .eq("username", trimmed)
        .single();

      if (!existing || (existing.password_hash && existing.password_hash !== hashed)) {
        setError("Wrong password");
        setChecking(false);
        return;
      }

      if (!existing.password_hash) {
        await supabase.from("users").update({ password_hash: hashed }).eq("username", trimmed);
      }

      localStorage.setItem("rpb-user", JSON.stringify({
        username: existing.username,
        avatarColor: existing.avatar_color,
        avatarUrl: existing.avatar_url,
      }));
      router.push("/chat");
    }
  }

  return (
    <div className="h-full flex items-center justify-center relative overflow-hidden">
      <div className="aurora-bg" />
      <div className="noise-overlay" />
      <Particles />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full blur-[150px]"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.25), rgba(236,72,153,0.15), transparent)", top: "-15%", left: "-10%" }}
          animate={{ x: [0, 80, 0], y: [0, 50, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full blur-[130px]"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.2), rgba(6,182,212,0.15), transparent)", bottom: "-15%", right: "-10%" }}
          animate={{ x: [0, -60, 0], y: [0, -40, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[350px] h-[350px] rounded-full blur-[100px]"
          style={{ background: "radial-gradient(circle, rgba(236,72,153,0.15), rgba(245,158,11,0.1), transparent)", top: "40%", left: "60%" }}
          animate={{ x: [0, 50, -50, 0], y: [0, -50, 30, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="text-center mb-10">
          <motion.div
            className="text-7xl mb-5 inline-block"
            animate={{ y: [0, -12, 0], rotate: [0, 3, -3, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            ⚡
          </motion.div>
          <motion.h1
            className="text-5xl font-extrabold gradient-text mb-3 tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Radiant Power Batch
          </motion.h1>
          <motion.p
            className="text-muted text-base"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Real-time group chat, supercharged
          </motion.p>
        </div>

        <motion.div
          className="glass-strong rounded-2xl p-8 glow-strong gradient-border"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          {step === "username" ? (
            <form onSubmit={handleUsernameSubmit}>
              <label htmlFor="username" className="block text-sm font-medium text-muted mb-3">
                Pick a username
              </label>
              <div className="input-glow rounded-xl transition-all">
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
                  disabled={checking}
                  className="w-full bg-surface/80 border border-border rounded-xl px-4 py-3.5 text-foreground placeholder:text-muted/40 focus:outline-none transition-all text-base disabled:opacity-50"
                />
              </div>
              <p className="text-muted/40 text-[11px] mt-1.5">New name = new account, existing = log in</p>
              {error && (
                <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-pink text-sm mt-2">{error}</motion.p>
              )}
              <motion.button
                type="submit"
                disabled={checking || username.trim().length < 2}
                whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(139,92,246,0.3)" }}
                whileTap={{ scale: 0.97 }}
                className="w-full mt-5 bg-gradient-to-r from-accent via-pink to-blue text-white font-semibold py-3.5 rounded-xl transition-all cursor-pointer btn-shimmer relative overflow-hidden disabled:opacity-50"
              >
                {checking ? "Checking..." : "Continue →"}
              </motion.button>
            </form>
          ) : (
            <form onSubmit={handlePasswordSubmit}>
              <label htmlFor="password" className="block text-sm font-medium text-muted mb-1">
                {isNewUser ? "Create a password" : "Enter your password"}
              </label>
              <p className="text-muted/40 text-[11px] mb-3">for &quot;{username.trim()}&quot;</p>
              <div className="input-glow rounded-xl transition-all">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder={isNewUser ? "Create a password..." : "Enter your password..."}
                  autoFocus
                  disabled={checking}
                  className="w-full bg-surface/80 border border-border rounded-xl px-4 py-3.5 text-foreground placeholder:text-muted/40 focus:outline-none transition-all text-base disabled:opacity-50"
                />
              </div>
              <p className="text-muted/40 text-[11px] mt-1.5">{isNewUser ? "Min 4 characters — remember this!" : "Same browser? You stay logged in"}</p>
              {error && (
                <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-pink text-sm mt-2">{error}</motion.p>
              )}
              <div className="flex gap-2 mt-5">
                <button type="button" onClick={() => { setStep("username"); setError(""); setPassword(""); }} className="px-5 py-3.5 rounded-xl text-muted hover:text-foreground border border-border hover:bg-surface-hover transition-all cursor-pointer text-sm">Back</button>
                <motion.button
                  type="submit"
                  disabled={checking || password.length < 4}
                  whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(139,92,246,0.3)" }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 bg-gradient-to-r from-accent via-pink to-blue text-white font-semibold py-3.5 rounded-xl transition-all cursor-pointer btn-shimmer relative overflow-hidden disabled:opacity-50"
                >
                  {checking ? "Checking..." : isNewUser ? "Create Account" : "Log In"}
                </motion.button>
              </div>
            </form>
          )}
        </motion.div>

        <motion.p
          className="text-center text-muted/30 text-xs mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Your account is secured with a password
        </motion.p>
      </motion.div>
    </div>
  );
}
