"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { Poll } from "@/lib/types";

export default function PollDisplay({ poll, username }: { poll: Poll; username: string }) {
  const votes = poll.votes || [];
  const myVote = votes.find((v) => v.username === username);
  const totalVotes = votes.length;
  const [voting, setVoting] = useState(false);

  async function vote(optionIndex: number) {
    setVoting(true);
    if (myVote) {
      if (myVote.option_index === optionIndex) {
        await supabase.from("poll_votes").delete().eq("id", myVote.id);
      } else {
        await supabase.from("poll_votes").update({ option_index: optionIndex }).eq("id", myVote.id);
      }
    } else {
      await supabase.from("poll_votes").insert({ poll_id: poll.id, username, option_index: optionIndex });
    }
    setVoting(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="bg-surface/60 border border-border rounded-xl p-3 max-w-sm mt-1.5 card-shine"
    >
      <div className="flex items-center gap-1.5 mb-2">
        <motion.span
          className="text-sm"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          📊
        </motion.span>
        <span className="text-xs font-semibold text-foreground/90">{poll.question}</span>
      </div>
      <div className="space-y-1.5">
        {poll.options.map((option: string, i: number) => {
          const optVotes = votes.filter((v) => v.option_index === i).length;
          const pct = totalVotes > 0 ? (optVotes / totalVotes) * 100 : 0;
          const selected = myVote?.option_index === i;
          return (
            <motion.button
              key={i}
              onClick={() => vote(i)}
              disabled={voting}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 300 }}
              whileHover={{ scale: 1.02, x: 3 }}
              whileTap={{ scale: 0.97 }}
              className={`w-full text-left rounded-lg p-2 transition-all cursor-pointer relative overflow-hidden ${
                selected ? "ring-1 ring-accent/40 bg-accent/10" : "hover:bg-surface-hover/50 bg-background/30"
              }`}
            >
              <div className="absolute inset-0 rounded-lg overflow-hidden">
                <motion.div
                  className="h-full"
                  style={{
                    background: selected
                      ? "linear-gradient(90deg, var(--color-accent-glow), rgba(139,92,246,0.08))"
                      : "rgba(139,92,246,0.06)",
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <div className="relative flex items-center justify-between">
                <span className={`text-[11px] ${selected ? "text-accent font-medium" : "text-foreground/70"}`}>
                  {selected && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="inline-block mr-1">✓</motion.span>}
                  {option}
                </span>
                <motion.span
                  className="text-[10px] text-muted/50"
                  key={optVotes}
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  {optVotes} {optVotes === 1 ? "vote" : "votes"}
                </motion.span>
              </div>
            </motion.button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[9px] text-muted/40">
          {totalVotes} total vote{totalVotes !== 1 ? "s" : ""}
        </span>
        {myVote && (
          <motion.span
            initial={{ opacity: 0, x: 5 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-[9px] text-accent/50"
          >
            You voted
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}
