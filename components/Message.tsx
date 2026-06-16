"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Message as MessageType, Reaction, REACTION_EMOJIS, detectMedia } from "@/lib/types";

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
        <span key={i} className={`font-semibold rounded px-0.5 ${isSelf ? "bg-accent/25 text-accent" : "text-blue hover:underline cursor-default"}`}>
          {token}
        </span>
      );
    }
    if (/^https?:\/\//.test(token)) {
      return <a key={i} href={token} target="_blank" rel="noopener noreferrer" className="text-blue hover:underline break-all">{token}</a>;
    }
    return token;
  });
}

function MediaContent({ content }: { content: string }) {
  const media = detectMedia(content);
  if (media.type === "image")
    return <a href={media.url} target="_blank" rel="noopener noreferrer"><img src={media.url} alt="" className="max-w-xs md:max-w-sm rounded-lg mt-1 max-h-80 object-contain" loading="lazy" /></a>;
  if (media.type === "gif")
    return <img src={media.url} alt="GIF" className="max-w-xs md:max-w-sm rounded-lg mt-1 max-h-64" loading="lazy" />;
  if (media.type === "video")
    return <video src={media.url} controls className="max-w-xs md:max-w-sm rounded-lg mt-1 max-h-80" preload="metadata" />;
  if (media.type === "youtube")
    return (
      <div className="mt-1">
        {media.text && <p className="text-sm text-foreground/90 break-words leading-relaxed mb-1">{media.text}</p>}
        <div className="rounded-lg overflow-hidden max-w-xs md:max-w-sm">
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`group flex gap-3 px-4 hover:bg-surface-hover/30 transition-colors ${isGrouped ? "py-0.5 pl-[4.25rem]" : "py-1.5 mt-1"}`}
    >
      {!isGrouped && (
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5" style={{ backgroundColor: message.avatar_color }}>
          {message.username[0].toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        {!isGrouped && (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold" style={{ color: message.avatar_color }}>{message.username}</span>
            <span className="text-[10px] text-muted/50 cursor-default" title={new Date(message.created_at).toLocaleString()}>{timeAgo(message.created_at)}</span>
          </div>
        )}
        {hasMedia ? <MediaContent content={message.content} /> : (
          <p className="text-sm text-foreground/90 break-words leading-relaxed">{renderTextContent(message.content, username)}</p>
        )}
        {grouped.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {grouped.map(({ emoji, users, count }) => {
              const hasReacted = users.includes(username);
              return (
                <button key={emoji} onClick={() => toggleReaction(emoji)} title={users.join(", ")} className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${hasReacted ? "bg-accent/20 border border-accent/40" : "bg-surface border border-border hover:border-border-bright"}`}>
                  <span>{emoji}</span>
                  <span className={hasReacted ? "text-accent" : "text-muted"}>{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="relative shrink-0 self-center flex items-center gap-0.5">
        {isOwn && (
          <>
            <button onClick={() => setConfirmDelete(!confirmDelete)} className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 text-xs transition-all cursor-pointer p-1 hover:bg-surface rounded" title="Delete">🗑️</button>
            <AnimatePresence>
              {confirmDelete && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute right-0 bottom-full mb-1 glass rounded-xl p-2 z-10 flex items-center gap-2 whitespace-nowrap">
                  <span className="text-xs text-muted">Delete?</span>
                  <button onClick={deleteMessage} className="text-xs text-red-400 hover:text-red-300 cursor-pointer font-medium">Yes</button>
                  <button onClick={() => setConfirmDelete(false)} className="text-xs text-muted hover:text-foreground cursor-pointer">No</button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
        <button onClick={() => setShowReactions(!showReactions)} className="opacity-0 group-hover:opacity-100 text-muted hover:text-foreground text-sm transition-all cursor-pointer p-1 hover:bg-surface rounded">😊</button>
        <AnimatePresence>
          {showReactions && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute right-0 bottom-full mb-1 glass rounded-xl p-2 flex gap-1 z-10">
              {REACTION_EMOJIS.map((emoji) => (
                <button key={emoji} onClick={() => toggleReaction(emoji)} className="text-base hover:scale-125 transition-transform cursor-pointer p-0.5">{emoji}</button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
