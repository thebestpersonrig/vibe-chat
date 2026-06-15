"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPresence } from "@/lib/types";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onTyping: () => void;
  placeholder: string;
  onlineUsers: UserPresence[];
  currentUser: string;
}

export default function MentionInput({
  value,
  onChange,
  onSubmit,
  onTyping,
  placeholder,
  onlineUsers,
  currentUser,
}: MentionInputProps) {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredUsers = onlineUsers.filter(
    (u) =>
      u.username !== currentUser &&
      u.username.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const detectMention = useCallback((text: string) => {
    const cursorPos = inputRef.current?.selectionStart ?? text.length;
    const textBefore = text.slice(0, cursorPos);
    const match = textBefore.match(/@(\w*)$/);

    if (match) {
      setMentionQuery(match[1]);
      setShowMentions(true);
      setSelectedIndex(0);
    } else {
      setShowMentions(false);
    }
  }, []);

  function insertMention(username: string) {
    const cursorPos = inputRef.current?.selectionStart ?? value.length;
    const textBefore = value.slice(0, cursorPos);
    const textAfter = value.slice(cursorPos);
    const newBefore = textBefore.replace(/@\w*$/, `@${username} `);
    onChange(newBefore + textAfter);
    setShowMentions(false);

    setTimeout(() => {
      const newPos = newBefore.length;
      inputRef.current?.setSelectionRange(newPos, newPos);
      inputRef.current?.focus();
    }, 0);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (showMentions && filteredUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredUsers.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length);
      } else if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        insertMention(filteredUsers[selectedIndex].username);
        return;
      } else if (e.key === "Escape") {
        setShowMentions(false);
        return;
      }
    }

    if (e.key === "Enter" && !showMentions) {
      e.preventDefault();
      onSubmit();
    }
  }

  useEffect(() => {
    if (!showMentions) return;
    function handleClick(e: MouseEvent) {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowMentions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMentions]);

  return (
    <div className="relative flex-1">
      <AnimatePresence>
        {showMentions && filteredUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-full mb-2 left-0 w-64 glass rounded-xl overflow-hidden z-20 shadow-xl"
          >
            <div className="px-3 py-2 border-b border-border">
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                Mention someone
              </span>
            </div>
            <div className="max-h-48 overflow-y-auto py-1">
              {filteredUsers.map((user, i) => (
                <button
                  key={user.username}
                  onClick={() => insertMention(user.username)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer ${
                    i === selectedIndex
                      ? "bg-accent/15 text-foreground"
                      : "text-foreground/80 hover:bg-surface-hover"
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: user.avatar_color }}
                  >
                    {user.username[0].toUpperCase()}
                  </div>
                  <span className="text-sm truncate">{user.username}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          detectMention(e.target.value);
          onTyping();
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
      />
    </div>
  );
}
