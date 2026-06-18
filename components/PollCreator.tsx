"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface PollCreatorProps {
  onSubmit: (question: string, options: string[]) => void;
  onCancel: () => void;
}

export default function PollCreator({ onSubmit, onCancel }: PollCreatorProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  function addOption() {
    if (options.length < 6) setOptions([...options, ""]);
  }

  function updateOption(i: number, val: string) {
    const copy = [...options];
    copy[i] = val;
    setOptions(copy);
  }

  function removeOption(i: number) {
    if (options.length <= 2) return;
    setOptions(options.filter((_, idx) => idx !== i));
  }

  function submit() {
    const q = question.trim();
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!q || opts.length < 2) return;
    onSubmit(q, opts);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute bottom-full mb-2 left-0 right-0 mx-3 glass-strong rounded-xl border border-border glow p-4 z-30"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold gradient-text">📊 Create Poll</span>
        <button onClick={onCancel} className="text-muted hover:text-foreground text-xs cursor-pointer">
          ✕
        </button>
      </div>
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a question..."
        autoFocus
        maxLength={200}
        className="w-full bg-surface/80 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all mb-3"
      />
      <div className="space-y-1.5">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted/40 w-4">{i + 1}.</span>
            <input
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              maxLength={100}
              className="flex-1 bg-background/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted/30 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all"
            />
            {options.length > 2 && (
              <button
                onClick={() => removeOption(i)}
                className="text-muted/30 hover:text-pink text-xs cursor-pointer p-1"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3">
        <button
          onClick={addOption}
          disabled={options.length >= 6}
          className="text-[10px] text-accent hover:text-accent-hover cursor-pointer disabled:opacity-30 disabled:cursor-default"
        >
          + Add option
        </button>
        <button
          onClick={submit}
          disabled={!question.trim() || options.filter((o) => o.trim()).length < 2}
          className="text-[10px] bg-gradient-to-r from-accent to-pink text-white px-4 py-1.5 rounded-lg cursor-pointer font-medium disabled:opacity-40 transition-all hover:opacity-90"
        >
          Create Poll
        </button>
      </div>
    </motion.div>
  );
}
