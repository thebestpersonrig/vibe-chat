"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TRIVIA_QUESTIONS = [
  { q: "What planet is known as the Red Planet?", a: "Mars" },
  { q: "What is the smallest country in the world?", a: "Vatican City" },
  { q: "How many bones are in the adult human body?", a: "206" },
  { q: "What element has the chemical symbol 'Au'?", a: "Gold" },
  { q: "What is the largest ocean on Earth?", a: "Pacific Ocean" },
  { q: "In what year did the Titanic sink?", a: "1912" },
  { q: "What is the hardest natural substance?", a: "Diamond" },
  { q: "How many hearts does an octopus have?", a: "Three" },
  { q: "What is the capital of Australia?", a: "Canberra" },
  { q: "What gas do plants absorb from the atmosphere?", a: "Carbon dioxide (CO₂)" },
  { q: "Who painted the Mona Lisa?", a: "Leonardo da Vinci" },
  { q: "What is the speed of light (approx)?", a: "300,000 km/s" },
  { q: "What is the longest river in the world?", a: "The Nile" },
  { q: "What animal is known as the King of the Jungle?", a: "Lion" },
  { q: "How many colors are in a rainbow?", a: "Seven" },
  { q: "What is the chemical formula for water?", a: "H₂O" },
  { q: "Which planet has the most moons?", a: "Saturn" },
  { q: "What year did World War II end?", a: "1945" },
  { q: "What is the tallest mountain in the world?", a: "Mount Everest" },
  { q: "What language has the most native speakers?", a: "Mandarin Chinese" },
  { q: "What is the square root of 144?", a: "12" },
  { q: "What continent is Egypt in?", a: "Africa" },
  { q: "What is the largest mammal?", a: "Blue whale" },
  { q: "What is the currency of Japan?", a: "Yen (¥)" },
  { q: "How many continents are there?", a: "Seven" },
  { q: "What is the main ingredient in guacamole?", a: "Avocado" },
  { q: "Who wrote Romeo and Juliet?", a: "William Shakespeare" },
  { q: "What is the smallest prime number?", a: "2" },
  { q: "What does 'HTTP' stand for?", a: "HyperText Transfer Protocol" },
  { q: "What planet is closest to the Sun?", a: "Mercury" },
];

const EIGHT_BALL_RESPONSES = [
  "It is certain ✨",
  "Without a doubt 💫",
  "Yes, definitely! 🎯",
  "You may rely on it 🌟",
  "As I see it, yes 👁️",
  "Most likely 🔮",
  "Outlook good 🌈",
  "Signs point to yes 🪧",
  "Reply hazy, try again 🌫️",
  "Ask again later ⏳",
  "Better not tell you now 🤐",
  "Cannot predict now 🎱",
  "Concentrate and ask again 🧘",
  "Don't count on it 👎",
  "My reply is no ❌",
  "My sources say no 📰",
  "Outlook not so good 😬",
  "Very doubtful 🤔",
];

interface EntertainmentMenuProps {
  onSendMessage: (content: string) => void;
  onTriggerConfetti: () => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

function DiceRollPopup({ onRoll, onClose }: { onRoll: (result: string) => void; onClose: () => void }) {
  const [sides, setSides] = useState(6);
  const [count, setCount] = useState(1);

  function roll() {
    const results: number[] = [];
    for (let i = 0; i < count; i++) {
      results.push(Math.floor(Math.random() * sides) + 1);
    }
    onRoll(`[dice:${count}:${sides}:${results.join(",")}]`);
    onClose();
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 5 }}
      className="absolute bottom-full mb-2 left-0 glass-strong rounded-xl border border-border p-3 w-56 z-50"
    >
      <p className="text-xs font-semibold text-foreground mb-2">🎲 Roll Dice</p>
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1">
          <label className="text-[10px] text-muted/60 block mb-0.5">Count</label>
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none cursor-pointer"
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-muted/60 block mb-0.5">Sides</label>
          <select
            value={sides}
            onChange={(e) => setSides(Number(e.target.value))}
            className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none cursor-pointer"
          >
            {[4, 6, 8, 10, 12, 20, 100].map((n) => (
              <option key={n} value={n}>d{n}</option>
            ))}
          </select>
        </div>
      </div>
      <button
        onClick={roll}
        className="w-full text-xs bg-accent/15 hover:bg-accent/25 text-accent py-2 rounded-lg cursor-pointer transition-colors font-medium"
      >
        Roll {count}d{sides}
      </button>
    </motion.div>
  );
}

export default function EntertainmentMenu({ onSendMessage, onTriggerConfetti, isOpen, onToggle, onClose }: EntertainmentMenuProps) {
  const [showDicePopup, setShowDicePopup] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
        setShowDicePopup(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  function coinFlip() {
    onSendMessage(`[coin:${Math.random() < 0.5 ? "Heads" : "Tails"}]`);
    onClose();
  }

  function eightBall() {
    const question = prompt("Ask the Magic 8-Ball a question:");
    if (!question?.trim()) return;
    const response = EIGHT_BALL_RESPONSES[Math.floor(Math.random() * EIGHT_BALL_RESPONSES.length)];
    onSendMessage(`[8ball:${question.trim()}|${response}]`);
    onClose();
  }

  function trivia() {
    const t = TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)];
    onSendMessage(`[trivia:${t.q}|${t.a}]`);
    onClose();
  }

  function confetti() {
    onTriggerConfetti();
    onSendMessage("[confetti]");
    onClose();
  }

  const items = [
    { emoji: "🎲", label: "Roll Dice", desc: "Roll any dice combo", action: () => setShowDicePopup(true) },
    { emoji: "🪙", label: "Coin Flip", desc: "Heads or tails", action: coinFlip },
    { emoji: "🎱", label: "Magic 8-Ball", desc: "Ask a question", action: eightBall },
    { emoji: "🎉", label: "Confetti", desc: "Celebrate!", action: confetti },
    { emoji: "🧠", label: "Trivia", desc: "Random trivia question", action: trivia },
  ];

  return (
    <div ref={menuRef} className="relative">
      <motion.button
        onClick={onToggle}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={`text-lg shrink-0 p-1.5 rounded-xl transition-all cursor-pointer ${isOpen ? "bg-accent/20 ring-1 ring-accent/30" : "hover:bg-surface-hover opacity-60 hover:opacity-100"}`}
        title="Fun & Games"
      >
        🎮
      </motion.button>

      <AnimatePresence>
        {isOpen && !showDicePopup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute bottom-full mb-2 left-0 glass-strong rounded-xl border border-border overflow-hidden z-50 w-52"
          >
            <div className="px-3 pt-2.5 pb-1.5">
              <p className="text-[10px] font-bold text-muted/50 uppercase tracking-wider">Fun & Games</p>
            </div>
            {items.map((item, i) => (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={item.action}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-surface-hover transition-colors cursor-pointer text-left"
              >
                <span className="text-lg">{item.emoji}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">{item.label}</p>
                  <p className="text-[10px] text-muted/50">{item.desc}</p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDicePopup && (
          <DiceRollPopup
            onRoll={(result) => { onSendMessage(result); setShowDicePopup(false); }}
            onClose={() => { setShowDicePopup(false); onClose(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
