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
    <div className="bg-surface/60 border border-border rounded-xl p-3 max-w-sm mt-1.5">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-sm">📊</span>
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
              whileTap={{ scale: 0.98 }}
              className={`w-full text-left rounded-lg p-2 transition-all cursor-pointer relative overflow-hidden ${
                selected ? "ring-1 ring-accent/40 bg-accent/10" : "hover:bg-surface-hover/50 bg-background/30"
              }`}
            >
              <div className="absolute inset-0 rounded-lg overflow-hidden">
                <motion.div
                  className="h-full bg-accent/10"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              <div className="relative flex items-center justify-between">
                <span className={`text-[11px] ${selected ? "text-accent font-medium" : "text-foreground/70"}`}>
                  {option}
                </span>
                <span className="text-[10px] text-muted/50">
                  {optVotes} {optVotes === 1 ? "vote" : "votes"}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[9px] text-muted/40">
          {totalVotes} total vote{totalVotes !== 1 ? "s" : ""}
        </span>
        {myVote && <span className="text-[9px] text-accent/50">You voted</span>}
      </div>
    </div>
  );
}
