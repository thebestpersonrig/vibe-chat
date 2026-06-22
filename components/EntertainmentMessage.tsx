"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Detection ──────────────────────────────────────────────────

interface DiceData { type: "dice"; count: number; sides: number; results: number[] }
interface CoinData { type: "coin"; result: "Heads" | "Tails" }
interface EightBallData { type: "8ball"; question: string; response: string }
interface TriviaData { type: "trivia"; question: string; answer: string }
export type FunData = DiceData | CoinData | EightBallData | TriviaData;

export function detectFunMessage(content: string): FunData | null {
  const dice = content.match(/^\[dice:(\d+):(\d+):([\d,]+)\]$/);
  if (dice) {
    return { type: "dice", count: parseInt(dice[1]), sides: parseInt(dice[2]), results: dice[3].split(",").map(Number) };
  }
  const coin = content.match(/^\[coin:(Heads|Tails)\]$/);
  if (coin) return { type: "coin", result: coin[1] as "Heads" | "Tails" };

  const ball = content.match(/^\[8ball:([^|]+)\|(.+)\]$/);
  if (ball) return { type: "8ball", question: ball[1], response: ball[2] };

  const trivia = content.match(/^\[trivia:([^|]+)\|(.+)\]$/);
  if (trivia) return { type: "trivia", question: trivia[1], answer: trivia[2] };

  return null;
}

// ─── Dice Roll ──────────────────────────────────────────────────

function DiceRollCard({ data, isNew }: { data: DiceData; isNew: boolean }) {
  const { count, sides, results } = data;
  const total = results.reduce((a, b) => a + b, 0);
  const animDuration = isNew ? 1800 : 0;
  const [displayed, setDisplayed] = useState<number[]>(isNew ? results.map(() => 1) : results);
  const [settled, setSettled] = useState<boolean[]>(isNew ? results.map(() => false) : results.map(() => true));
  const [showTotal, setShowTotal] = useState(!isNew);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isNew) return;

    intervalRef.current = setInterval(() => {
      setDisplayed(prev => prev.map((_, i) => settled[i] ? results[i] : Math.floor(Math.random() * sides) + 1));
    }, 60);

    results.forEach((_, i) => {
      const delay = 600 + i * 350;
      setTimeout(() => {
        setSettled(prev => { const n = [...prev]; n[i] = true; return n; });
        setDisplayed(prev => { const n = [...prev]; n[i] = results[i]; return n; });
      }, delay);
    });

    setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setShowTotal(true);
    }, animDuration);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const diceFace = (n: number) => {
    const faces: Record<number, string> = { 1: "⚀", 2: "⚁", 3: "⚂", 4: "⚃", 5: "⚄", 6: "⚅" };
    return sides === 6 ? (faces[n] || "🎲") : "🎲";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="my-1 max-w-xs"
    >
      <div className="rounded-2xl overflow-hidden border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-surface/80 to-indigo-500/5">
        <div className="px-3.5 pt-3 pb-1 flex items-center gap-2">
          <motion.span
            className="text-lg"
            animate={isNew ? { rotate: [0, -20, 20, -15, 15, -5, 0], scale: [1, 1.2, 1, 1.15, 1, 1.05, 1] } : {}}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            🎲
          </motion.span>
          <span className="text-[11px] font-bold text-purple-400/80 uppercase tracking-wider">Dice Roll</span>
          <span className="text-[10px] text-muted/40 ml-auto">{count}d{sides}</span>
        </div>

        <div className="px-3.5 pb-2 flex flex-wrap gap-2 justify-center">
          {displayed.map((val, i) => (
            <motion.div
              key={i}
              className="relative"
              animate={settled[i]
                ? { scale: [1.3, 1], y: [isNew ? -8 : 0, 0] }
                : isNew ? { y: [0, -3, 0], rotate: [0, 5, -5, 0] } : {}
              }
              transition={settled[i]
                ? { type: "spring", stiffness: 500, damping: 15 }
                : { duration: 0.15, repeat: Infinity }
              }
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${settled[i]
                ? "bg-purple-500/20 border-2 border-purple-400/40 shadow-lg shadow-purple-500/20"
                : "bg-surface/60 border border-border"
              }`}>
                {sides === 6 ? (
                  <span className="text-2xl">{diceFace(val)}</span>
                ) : (
                  <motion.span
                    className={`text-lg font-black tabular-nums ${settled[i] ? "text-purple-300" : "text-muted/60"}`}
                    animate={settled[i] && isNew ? { scale: [1.4, 1], textShadow: ["0 0 15px rgba(139,92,246,0.8)", "0 0 0px rgba(139,92,246,0)"] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    {val}
                  </motion.span>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {count > 1 && (
          <AnimatePresence>
            {showTotal && (
              <motion.div
                initial={isNew ? { opacity: 0, y: 8 } : { opacity: 1, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="px-3.5 pb-3 pt-1 flex items-center justify-center gap-2 border-t border-purple-500/10"
              >
                <span className="text-[10px] text-muted/50 uppercase tracking-wider">Total</span>
                <motion.span
                  className="text-lg font-black text-purple-300"
                  animate={isNew ? { scale: [1.5, 1], textShadow: ["0 0 20px rgba(139,92,246,0.6)", "0 0 0px rgba(139,92,246,0)"] } : {}}
                  transition={{ duration: 0.6 }}
                >
                  {total}
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {count === 1 && (
          <div className="h-1.5" />
        )}
      </div>
    </motion.div>
  );
}

// ─── Coin Flip ──────────────────────────────────────────────────

function CoinFlipCard({ data, isNew }: { data: CoinData; isNew: boolean }) {
  const { result } = data;
  const [phase, setPhase] = useState<"flipping" | "done">(isNew ? "flipping" : "done");
  const [displayFace, setDisplayFace] = useState(result);

  useEffect(() => {
    if (!isNew) return;

    let count = 0;
    const interval = setInterval(() => {
      count++;
      setDisplayFace(count % 2 === 0 ? "Heads" : "Tails");
      if (count >= 12) {
        clearInterval(interval);
        setDisplayFace(result);
        setPhase("done");
      }
    }, 120);

    return () => clearInterval(interval);
  }, []);

  const isHeads = result === "Heads";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="my-1 max-w-[200px]"
    >
      <div className="rounded-2xl overflow-hidden border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-surface/80 to-yellow-500/5">
        <div className="px-3.5 pt-3 pb-1 flex items-center gap-2">
          <span className="text-lg">🪙</span>
          <span className="text-[11px] font-bold text-amber-400/80 uppercase tracking-wider">Coin Flip</span>
        </div>

        <div className="flex flex-col items-center py-3 px-3.5">
          <div className="relative" style={{ perspective: "600px" }}>
            <motion.div
              className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl border-4 transition-colors duration-300 ${
                phase === "done"
                  ? isHeads
                    ? "bg-gradient-to-br from-amber-400/30 to-yellow-500/20 border-amber-400/50 shadow-lg shadow-amber-500/30"
                    : "bg-gradient-to-br from-slate-400/30 to-blue-400/20 border-slate-400/40 shadow-lg shadow-slate-400/20"
                  : "bg-surface/60 border-border"
              }`}
              animate={
                phase === "flipping"
                  ? { rotateY: [0, 180, 360, 540, 720, 900, 1080, 1260, 1440], scale: [1, 1.1, 1, 1.1, 1, 1.1, 1, 1.05, 1] }
                  : { rotateY: 0, scale: [isNew ? 1.2 : 1, 1] }
              }
              transition={
                phase === "flipping"
                  ? { duration: 1.5, ease: [0.25, 0.1, 0.25, 1] }
                  : { type: "spring", stiffness: 400, damping: 12 }
              }
              style={{ transformStyle: "preserve-3d" }}
            >
              <motion.span
                animate={phase === "done" && isNew ? {
                  scale: [1.3, 1],
                  filter: ["drop-shadow(0 0 12px rgba(251,191,36,0.6))", "drop-shadow(0 0 0px rgba(251,191,36,0))"],
                } : {}}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                {displayFace === "Heads" ? "👑" : "🌙"}
              </motion.span>
            </motion.div>
          </div>

          <AnimatePresence>
            {phase === "done" && (
              <motion.div
                initial={isNew ? { opacity: 0, y: 10, scale: 0.8 } : { opacity: 1, y: 0, scale: 1 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15, delay: isNew ? 0.15 : 0 }}
                className="mt-2.5 text-center"
              >
                <span className={`text-base font-black ${isHeads ? "text-amber-300" : "text-slate-300"}`}>
                  {result}!
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Magic 8-Ball ───────────────────────────────────────────────

function EightBallCard({ data, isNew }: { data: EightBallData; isNew: boolean }) {
  const { question, response } = data;
  const [phase, setPhase] = useState<"shaking" | "revealing" | "done">(isNew ? "shaking" : "done");

  useEffect(() => {
    if (!isNew) return;
    const t1 = setTimeout(() => setPhase("revealing"), 1200);
    const t2 = setTimeout(() => setPhase("done"), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const isPositive = /certain|yes|definitely|good|likely|rely|signs point/i.test(response);
  const isNeutral = /hazy|again|later|cannot|better not/i.test(response);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="my-1 max-w-xs"
    >
      <div className="rounded-2xl overflow-hidden border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-surface/80 to-violet-500/5">
        <div className="px-3.5 pt-3 pb-1 flex items-center gap-2">
          <span className="text-lg">🎱</span>
          <span className="text-[11px] font-bold text-indigo-400/80 uppercase tracking-wider">Magic 8-Ball</span>
        </div>

        <div className="px-3.5 pb-1.5">
          <p className="text-xs text-muted/60 italic">&ldquo;{question}&rdquo;</p>
        </div>

        <div className="flex justify-center py-3 px-3.5">
          <motion.div
            className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-900 to-gray-800 border-4 border-gray-700/80 flex items-center justify-center relative overflow-hidden shadow-xl shadow-black/40"
            animate={
              phase === "shaking"
                ? { x: [0, -6, 8, -8, 6, -4, 3, 0], y: [0, 3, -4, 3, -3, 2, -1, 0], rotate: [0, -3, 4, -4, 3, -2, 1, 0] }
                : {}
            }
            transition={{ duration: 0.6, repeat: phase === "shaking" ? Infinity : 0, ease: "easeInOut" }}
          >
            {/* Glossy highlight */}
            <div className="absolute top-1 left-3 w-8 h-4 bg-white/10 rounded-full blur-sm" />

            {/* Blue triangle answer area */}
            <motion.div
              className="relative z-10"
              initial={isNew ? { opacity: 0, scale: 0.3 } : { opacity: 1, scale: 1 }}
              animate={phase !== "shaking" ? { opacity: 1, scale: 1 } : { opacity: 0.15, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, duration: 0.6 }}
            >
              {/* Triangle shape */}
              <div className="w-16 h-16 flex items-center justify-center relative">
                <svg viewBox="0 0 60 52" className="absolute inset-0 w-full h-full">
                  <polygon
                    points="30,2 58,50 2,50"
                    fill="rgba(59,130,246,0.25)"
                    stroke="rgba(99,102,241,0.5)"
                    strokeWidth="1.5"
                  />
                </svg>
                <motion.span
                  className="text-[8px] font-bold text-blue-300 text-center leading-tight pt-2 px-1 relative z-10 max-w-[50px]"
                  initial={isNew ? { opacity: 0, filter: "blur(4px)" } : {}}
                  animate={phase === "done" ? { opacity: 1, filter: "blur(0px)" } : phase === "revealing" ? { opacity: 0.7, filter: "blur(2px)" } : { opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {response.replace(/[✨💫🎯🌟👁️🔮🌈🪧🌫️⏳🤐🎱🧘👎❌📰😬🤔]/g, "").trim()}
                </motion.span>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <AnimatePresence>
          {phase === "done" && (
            <motion.div
              initial={isNew ? { opacity: 0, y: 8 } : { opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="px-3.5 pb-3 pt-1 border-t border-indigo-500/10 text-center"
            >
              <motion.span
                className={`text-sm font-bold ${isPositive ? "text-emerald-400" : isNeutral ? "text-amber-400" : "text-rose-400"}`}
                animate={isNew ? { scale: [1.2, 1] } : {}}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                {response}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Trivia ─────────────────────────────────────────────────────

function TriviaCard({ data, isNew }: { data: TriviaData; isNew: boolean }) {
  const { question, answer } = data;
  const [revealed, setRevealed] = useState(false);
  const [thinking, setThinking] = useState(isNew);

  useEffect(() => {
    if (!isNew) { setThinking(false); return; }
    const t = setTimeout(() => setThinking(false), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="my-1 max-w-sm"
    >
      <div className="rounded-2xl overflow-hidden border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-surface/80 to-teal-500/5">
        <div className="px-3.5 pt-3 pb-1 flex items-center gap-2">
          <motion.span
            className="text-lg"
            animate={thinking ? { rotate: [0, 15, -15, 10, -10, 0], scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 0.6 }}
          >
            🧠
          </motion.span>
          <span className="text-[11px] font-bold text-emerald-400/80 uppercase tracking-wider">Trivia Time</span>
        </div>

        <div className="px-3.5 py-2.5">
          <motion.p
            className="text-sm font-semibold text-foreground/90 leading-relaxed"
            initial={isNew ? { opacity: 0 } : { opacity: 1 }}
            animate={{ opacity: 1 }}
            transition={{ delay: isNew ? 0.3 : 0 }}
          >
            {question}
          </motion.p>
        </div>

        <div className="px-3.5 pb-3">
          <AnimatePresence mode="wait">
            {!revealed ? (
              <motion.button
                key="reveal-btn"
                onClick={() => setRevealed(true)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                initial={isNew ? { opacity: 0, y: 5 } : { opacity: 1, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: isNew ? 0.5 : 0, type: "spring", stiffness: 300 }}
                className="w-full text-xs bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 py-2.5 rounded-xl cursor-pointer transition-colors font-semibold border border-emerald-500/20 flex items-center justify-center gap-2"
              >
                <motion.span
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  👀
                </motion.span>
                Tap to Reveal Answer
              </motion.button>
            ) : (
              <motion.div
                key="answer"
                initial={{ opacity: 0, y: -5, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3.5 py-2.5 text-center"
              >
                <span className="text-[10px] text-emerald-500/60 uppercase tracking-wider font-medium">Answer</span>
                <motion.p
                  className="text-sm font-bold text-emerald-300 mt-0.5"
                  initial={{ scale: 0.8, filter: "blur(4px)" }}
                  animate={{ scale: 1, filter: "blur(0px)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  {answer}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────

const animatedMessages = new Set<string>();

export default function EntertainmentMessageCard({ data, createdAt }: { data: FunData; createdAt: string }) {
  const key = `${data.type}:${createdAt}`;
  const recent = Date.now() - new Date(createdAt).getTime() < 8000;
  const isNew = recent && !animatedMessages.has(key);

  useEffect(() => {
    if (recent) animatedMessages.add(key);
  }, [key, recent]);

  switch (data.type) {
    case "dice": return <DiceRollCard data={data} isNew={isNew} />;
    case "coin": return <CoinFlipCard data={data} isNew={isNew} />;
    case "8ball": return <EightBallCard data={data} isNew={isNew} />;
    case "trivia": return <TriviaCard data={data} isNew={isNew} />;
  }
}
