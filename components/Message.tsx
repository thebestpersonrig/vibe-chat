"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Message as MessageType, Reaction, REACTION_EMOJIS, detectMedia } from "@/lib/types";
import Avatar from "@/components/Avatar";

interface MessageProps {
  message: MessageType;
  isOwn: boolean;
  username: string;
  isGrouped: boolean;
}

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 10) return "now";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function groupReactions(reactions: Reaction[]): { emoji: string; users: string[]; count: number }[] {
  const map = new Map<string, string[]>();
  for (const r of reactions) {
    const list = map.get(r.emoji) || [];
    list.push(r.username);
    map.set(r.emoji, list);
  }
  return Array.from(map.entries()).map(([emoji, users]) => ({ emoji, users, count: users.length }));
}

function renderTextContent(content: string, currentUser: string) {
  const tokens = content.split(/((?:https?:\/\/[^\s<]+[^\s<.,;:!?"'\])}>])|@\w+)/g);
  return tokens.map((token, i) => {
    if (token.startsWith("@")) {
      const mentioned = token.slice(1);
      const isSelf = mentioned.toLowerCase() === currentUser.toLowerCase();
      return (
        <span key={i} className={`font-semibold rounded px-1 py-0.5 ${isSelf ? "bg-accent/20 text-accent ring-1 ring-accent/30" : "text-blue hover:underline cursor-default"}`}>
          {token}
        </span>
      );
    }
    if (/^https?:\/\//.test(token)) {
      return <a key={i} href={token} target="_blank" rel="noopener noreferrer" className="text-cyan hover:text-blue hover:underline break-all transition-colors">{token}</a>;
    }
    return token;
  });
}

function MediaContent({ content }: { content: string }) {
  const media = detectMedia(content);
  if (media.type === "image")
    return <a href={media.url} target="_blank" rel="noopener noreferrer"><img src={media.url} alt="" className="max-w-xs md:max-w-sm rounded-xl mt-1.5 max-h-80 object-contain ring-1 ring-border hover:ring-accent/30 transition-all" loading="lazy" /></a>;
  if (media.type === "gif")
    return <img src={media.url} alt="GIF" className="max-w-xs md:max-w-sm rounded-xl mt-1.5 max-h-64 ring-1 ring-border" loading="lazy" />;
  if (media.type === "video")
    return <video src={media.url} controls className="max-w-xs md:max-w-sm rounded-xl mt-1.5 max-h-80 ring-1 ring-border" preload="metadata" />;
  if (media.type === "youtube")
    return (
      <div className="mt-1.5">
        {media.text && <p className="text-sm text-foreground/90 break-words leading-relaxed mb-1.5">{media.text}</p>}
        <div className="rounded-xl overflow-hidden max-w-xs md:max-w-sm ring-1 ring-border">
          <iframe width="100%" height="200" src={`https://www.youtube-nocookie.com/embed/${media.url}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="border-0" />
        </div>
      </div>
    );
  return null;
}

export default function Message({ message, isOwn, username, isGrouped }: MessageProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const grouped = groupReactions(message.reactions || []);
  const hasMedia = detectMedia(message.content).type !== null;

  async function toggleReaction(emoji: string) {
    const existing = (message.reactions || []).find((r) => r.emoji === emoji && r.username === username);
    if (existing) await supabase.from("reactions").delete().eq("id", existing.id);
    else await supabase.from("reactions").insert({ message_id: message.id, username, emoji });
    setShowReactions(false);
  }

  async function deleteMessage() {
    await supabase.from("messages").delete().eq("id", message.id);
    setConfirmDelete(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={`group flex gap-3 px-4 md:px-5 rounded-lg mx-1 transition-all duration-200 ${isGrouped ? "py-0.5" : "py-1.5 mt-1"} hover:bg-gradient-to-r hover:from-surface-hover/40 hover:to-transparent`}
    >
      {isGrouped ? (
        <div className="w-9 shrink-0" />
      ) : (
        <Avatar username={message.username} avatarColor={message.avatar_color} avatarUrl={message.avatar_url} size="md" className="mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        {!isGrouped && (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold hover:underline cursor-default" style={{ color: message.avatar_color }}>{message.username}</span>
            <span className="text-[10px] text-muted/40 cursor-default" title={new Date(message.created_at).toLocaleString()}>{timeAgo(message.created_at)}</span>
          </div>
        )}
        {hasMedia ? <MediaContent content={message.content} /> : (
          <p className="text-sm text-foreground/85 break-words leading-relaxed">{renderTextContent(message.content, username)}</p>
        )}
        {grouped.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {grouped.map(({ emoji, users, count }) => {
              const hasReacted = users.includes(username);
              return (
                <motion.button
                  key={emoji}
                  onClick={() => toggleReaction(emoji)}
                  whileTap={{ scale: 0.9 }}
                  title={users.join(", ")}
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-all cursor-pointer ${hasReacted ? "bg-accent/15 border border-accent/30 shadow-sm shadow-accent/10" : "bg-surface/80 border border-border hover:border-border-bright hover:bg-surface-hover"}`}
                >
                  <span>{emoji}</span>
                  <span className={hasReacted ? "text-accent font-medium" : "text-muted"}>{count}</span>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
      <div className="relative shrink-0 self-center flex items-center gap-0.5">
        {isOwn && (
          <>
            <button onClick={() => setConfirmDelete(!confirmDelete)} className="opacity-0 group-hover:opacity-100 text-muted hover:text-pink text-xs transition-all cursor-pointer p-1.5 hover:bg-surface rounded-lg" title="Delete">🗑️</button>
            <AnimatePresence>
              {confirmDelete && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute right-0 bottom-full mb-1 glass-strong rounded-xl p-2.5 z-10 flex items-center gap-2 whitespace-nowrap glow">
                  <span className="text-xs text-muted">Delete?</span>
                  <button onClick={deleteMessage} className="text-xs text-pink hover:text-pink/80 cursor-pointer font-semibold">Yes</button>
                  <button onClick={() => setConfirmDelete(false)} className="text-xs text-muted hover:text-foreground cursor-pointer">No</button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
        <button onClick={() => setShowReactions(!showReactions)} className="opacity-0 group-hover:opacity-100 text-muted hover:text-foreground text-sm transition-all cursor-pointer p-1.5 hover:bg-surface rounded-lg">😊</button>
        <AnimatePresence>
          {showReactions && (
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 5 }} className="absolute right-0 bottom-full mb-1 glass-strong rounded-2xl p-2 flex gap-0.5 z-10 glow">
              {REACTION_EMOJIS.map((emoji) => (
                <motion.button key={emoji} onClick={() => toggleReaction(emoji)} whileHover={{ scale: 1.3 }} whileTap={{ scale: 0.8 }} className="text-base cursor-pointer p-1 rounded-lg hover:bg-surface-hover transition-colors">{emoji}</motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
