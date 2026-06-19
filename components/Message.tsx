"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Message as MessageType, Reaction, REACTION_EMOJIS, detectMedia, Poll, CustomEmoji } from "@/lib/types";
import Avatar from "@/components/Avatar";
import LinkPreview from "@/components/LinkPreview";
import AudioPlayer from "@/components/AudioPlayer";
import PollDisplay from "@/components/PollDisplay";

interface MessageProps {
  message: MessageType;
  isOwn: boolean;
  username: string;
  isGrouped: boolean;
  isAdmin: boolean;
  senderTitle?: string | null;
  replyMessage?: MessageType | null;
  onReply?: (msg: MessageType) => void;
  onEdit?: (id: string, newContent: string) => void;
  onPin?: (id: string, pinned: boolean) => void;
  onOpenProfile?: (username: string) => void;
  onOpenLightbox?: (url: string) => void;
  onScrollToMessage?: (id: string) => void;
  isMuted?: boolean;
  pollData?: Poll | null;
  customEmojis?: CustomEmoji[];
  allUsernames?: string[];
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

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isEmojiOnly(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > 20) return false;
  return /^[\p{Emoji_Presentation}\p{Extended_Pictographic}️‍]+$/u.test(trimmed);
}

function renderMarkdown(text: string, keyPrefix: string): React.ReactNode[] {
  const mdRegex = /(```[\s\S]*?```|`[^`\n]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|__[^_]+__|_[^_]+_)/g;
  const parts = text.split(mdRegex).filter(Boolean);
  return parts.map((part, j) => {
    const k = `${keyPrefix}-md${j}`;
    if (part.startsWith("```") && part.endsWith("```")) {
      const code = part.slice(3, -3).replace(/^\n/, "");
      return <pre key={k} className="bg-background/60 border border-border rounded-lg px-3 py-2 text-[12px] font-mono text-foreground/80 overflow-x-auto my-1 whitespace-pre-wrap">{code}</pre>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={k} className="bg-background/60 border border-border rounded px-1.5 py-0.5 text-[12px] font-mono text-pink/80">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("***") && part.endsWith("***")) {
      return <strong key={k} className="italic">{part.slice(3, -3)}</strong>;
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={k}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("__") && part.endsWith("__")) {
      return <strong key={k}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("~~") && part.endsWith("~~")) {
      return <s key={k} className="text-muted/50">{part.slice(2, -2)}</s>;
    }
    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) {
      return <em key={k}>{part.slice(1, -1)}</em>;
    }
    return <span key={k}>{part}</span>;
  });
}

function renderTextContent(content: string, currentUser: string, allUsernames?: string[], customEmojis?: CustomEmoji[]) {
  const urlPart = "(?:https?:\\/\\/[^\\s<]+[^\\s<.,;:!?\"'\\])}>])";
  const parts = [urlPart];

  if (allUsernames && allUsernames.length > 0) {
    const sorted = [...allUsernames].sort((a, b) => b.length - a.length);
    parts.push("(?:" + sorted.map((n) => "@" + escapeRegex(n)).join("|") + ")");
  } else {
    parts.push("@\\w+");
  }

  if (customEmojis && customEmojis.length > 0) {
    parts.push(":(?:" + customEmojis.map((e) => escapeRegex(e.name)).join("|") + "):");
  }

  const regex = new RegExp("(" + parts.join("|") + ")", "gi");
  const tokens = content.split(regex).filter(Boolean);

  return tokens.map((token, i) => {
    if (token.startsWith("@")) {
      const mentioned = token.slice(1);
      const isSelf = mentioned.toLowerCase() === currentUser.toLowerCase();
      return (
        <span key={i} className={`font-semibold rounded px-1.5 py-0.5 ${isSelf ? "bg-accent/20 text-accent ring-1 ring-accent/30 mention-highlight" : "text-blue hover:underline cursor-default"}`}>
          {token}
        </span>
      );
    }
    if (/^https?:\/\//.test(token)) {
      return <a key={i} href={token} target="_blank" rel="noopener noreferrer" className="text-cyan hover:text-blue hover:underline break-all transition-colors">{token}</a>;
    }
    if (customEmojis && /^:[^:]+:$/.test(token)) {
      const name = token.slice(1, -1);
      const emoji = customEmojis.find((e) => e.name.toLowerCase() === name.toLowerCase());
      if (emoji) {
        return <img key={i} src={emoji.url} alt={token} title={token} className="inline-block w-6 h-6 object-contain align-text-bottom mx-0.5" />;
      }
    }
    return <span key={i}>{renderMarkdown(token, String(i))}</span>;
  });
}

function extractFirstUrl(content: string): string | null {
  const match = content.match(/https?:\/\/[^\s<]+[^\s<.,;:!?"'\])}>]/);
  return match?.[0] || null;
}

function MediaContent({ content, onOpenLightbox }: { content: string; onOpenLightbox?: (url: string) => void }) {
  const media = detectMedia(content);
  if (media.type === "image")
    return (
      <img
        src={media.url}
        alt=""
        onClick={() => onOpenLightbox?.(media.url)}
        className="max-w-xs md:max-w-sm rounded-2xl mt-1.5 max-h-80 object-contain ring-1 ring-border media-hover cursor-zoom-in"
        loading="lazy"
      />
    );
  if (media.type === "gif")
    return <img src={media.url} alt="GIF" className="max-w-xs md:max-w-sm rounded-2xl mt-1.5 max-h-64 ring-1 ring-border media-hover" loading="lazy" />;
  if (media.type === "audio")
    return <AudioPlayer url={media.url} />;
  if (media.type === "video")
    return <video src={media.url} controls className="max-w-xs md:max-w-sm rounded-2xl mt-1.5 max-h-80 ring-1 ring-border" preload="metadata" />;
  if (media.type === "youtube")
    return (
      <div className="mt-1.5">
        {media.text && <p className="text-sm text-foreground/90 break-words leading-relaxed mb-1.5">{media.text}</p>}
        <div className="rounded-2xl overflow-hidden max-w-xs md:max-w-sm ring-1 ring-border media-hover">
          <iframe width="100%" height="200" src={`https://www.youtube-nocookie.com/embed/${media.url}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="border-0" />
        </div>
      </div>
    );
  return null;
}

export default function Message({ message, isOwn, username, isGrouped, isAdmin, senderTitle, replyMessage, onReply, onEdit, onPin, onOpenProfile, onOpenLightbox, onScrollToMessage, isMuted, pollData, customEmojis, allUsernames }: MessageProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuFlip, setMenuFlip] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [pendingReactions, setPendingReactions] = useState<{emoji: string; add: boolean}[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const hoverBarRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  const effectiveReactions = (() => {
    let reactions = [...(message.reactions || [])];
    for (const p of pendingReactions) {
      if (p.add) {
        if (!reactions.find(r => r.emoji === p.emoji && r.username === username)) {
          reactions.push({ id: `pending-${p.emoji}`, message_id: message.id, username, emoji: p.emoji });
        }
      } else {
        reactions = reactions.filter(r => !(r.emoji === p.emoji && r.username === username));
      }
    }
    return reactions;
  })();
  const grouped = groupReactions(effectiveReactions);
  const hasMedia = detectMedia(message.content).type !== null;
  const isPoll = /^\[poll:[a-f0-9-]+\]$/.test(message.content.trim());
  const stickerMatch = message.content.trim().match(/^\[sticker:(.+)\]$/);
  const stickerUrl = stickerMatch?.[1] || null;
  const emojiOnly = !hasMedia && !isPoll && !stickerUrl && isEmojiOnly(message.content);
  const firstUrl = !hasMedia && !isPoll && !stickerUrl && !emojiOnly ? extractFirstUrl(message.content) : null;
  const canDelete = isOwn || isAdmin;
  const canEdit = isOwn;

  useEffect(() => {
    if (!showMenu && !showReactions && !confirmDelete) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const inMenu = menuRef.current?.contains(target);
      const inHoverBar = hoverBarRef.current?.contains(target);
      if (!inMenu && !inHoverBar) {
        setShowMenu(false);
        setShowReactions(false);
        setConfirmDelete(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu, showReactions, confirmDelete]);

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      editRef.current.setSelectionRange(editText.length, editText.length);
    }
  }, [isEditing]);

  useEffect(() => {
    if (pendingReactions.length > 0) setPendingReactions([]);
  }, [message.reactions]);

  async function toggleReaction(emoji: string) {
    if (isMuted) return;
    const existing = (message.reactions || []).find((r) => r.emoji === emoji && r.username === username);
    if (existing) {
      setPendingReactions(prev => [...prev, { emoji, add: false }]);
      await supabase.from("reactions").delete().eq("id", existing.id);
    } else {
      setPendingReactions(prev => [...prev, { emoji, add: true }]);
      await supabase.from("reactions").insert({ message_id: message.id, username, emoji });
    }
    setShowReactions(false);
    setShowMenu(false);
  }

  async function deleteMessage() {
    await supabase.from("messages").delete().eq("id", message.id);
    setConfirmDelete(false);
    setShowMenu(false);
  }

  function handleEditSave() {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== message.content) {
      onEdit?.(message.id, trimmed);
    }
    setIsEditing(false);
    setShowMenu(false);
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); handleEditSave(); }
    if (e.key === "Escape") { setIsEditing(false); setEditText(message.content); }
  }

  return (
    <motion.div
      id={`msg-${message.id}`}
      initial={{ opacity: 0, y: 12, x: isOwn ? 15 : -15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 350, damping: 30, mass: 0.8 }}
      className={`group flex gap-3 px-4 md:px-5 rounded-xl mx-1 msg-hover ${isOwn ? "msg-own" : ""} ${isGrouped ? "py-0.5" : "py-2 mt-0.5"}`}
    >
      {isGrouped ? (
        <div className="w-9 shrink-0" />
      ) : (
        <motion.div
          whileHover={{ scale: 1.15, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
          onClick={() => onOpenProfile?.(message.username)}
          className="cursor-pointer"
        >
          <Avatar username={message.username} avatarColor={message.avatar_color} avatarUrl={message.avatar_url} size="md" className="mt-0.5" />
        </motion.div>
      )}
      <div className="flex-1 min-w-0">
        {!isGrouped && (
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span
              onClick={() => onOpenProfile?.(message.username)}
              className="text-[13px] font-semibold transition-colors hover:underline cursor-pointer"
              style={{ color: message.avatar_color }}
            >
              {message.username}
            </span>
            {message.is_pinned && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className="text-[9px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full font-medium"
              >
                📌 pinned
              </motion.span>
            )}
            {senderTitle && (
              <motion.span
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-[9px] bg-accent/10 text-accent/70 px-1.5 py-0.5 rounded-full border border-accent/15 font-medium"
              >
                {senderTitle}
              </motion.span>
            )}
            <span className="text-[10px] text-muted/40 cursor-default select-none" title={new Date(message.created_at).toLocaleString()}>
              {timeAgo(message.created_at)}
              {message.edited_at && <span className="ml-1 text-muted/30">(edited)</span>}
            </span>
          </div>
        )}

        {message.reply_to && replyMessage && (
          <motion.div
            initial={{ opacity: 0, x: -10, height: 0 }}
            animate={{ opacity: 1, x: 0, height: "auto" }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={() => onScrollToMessage?.(replyMessage.id)}
            className="mb-1.5 pl-3 border-l-2 border-accent/30 rounded-sm max-w-sm cursor-pointer hover:bg-accent/5 hover:border-accent/60 transition-colors rounded-r-lg"
          >
            <span className="text-[10px] text-accent/60 font-medium">
              {replyMessage.username}
            </span>
            <p className="text-[11px] text-muted/50 truncate">{replyMessage.content}</p>
          </motion.div>
        )}
        {message.reply_to && !replyMessage && (
          <div className="mb-1.5 pl-3 border-l-2 border-border rounded-sm">
            <p className="text-[11px] text-muted/30 italic">Original message deleted</p>
          </div>
        )}

        {isEditing ? (
          <div className="flex gap-2 items-center">
            <input
              ref={editRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleEditKeyDown}
              className="flex-1 bg-surface/80 border border-accent/30 rounded-lg px-3 py-1.5 text-[13.5px] text-foreground focus:outline-none focus:ring-1 focus:ring-accent/40 transition-all"
            />
            <button onClick={handleEditSave} className="text-[10px] text-accent font-medium cursor-pointer hover:text-accent-hover px-2 py-1 rounded-lg hover:bg-accent/10 transition-colors">Save</button>
            <button onClick={() => { setIsEditing(false); setEditText(message.content); }} className="text-[10px] text-muted cursor-pointer hover:text-foreground px-2 py-1 rounded-lg hover:bg-surface-hover transition-colors">Cancel</button>
          </div>
        ) : isPoll && pollData ? (
          <PollDisplay poll={pollData} username={username} />
        ) : hasMedia ? (
          <MediaContent content={message.content} onOpenLightbox={onOpenLightbox} />
        ) : stickerUrl ? (
          <img src={stickerUrl} alt="Sticker" className="w-32 h-32 object-contain sticker-pop" />
        ) : emojiOnly ? (
          <p className="text-5xl leading-tight py-1 sticker-pop">{message.content.trim()}</p>
        ) : (
          <>
            <p className="text-[13.5px] text-foreground/90 break-words leading-[1.55]">{renderTextContent(message.content, username, allUsernames, customEmojis)}</p>
            {firstUrl && <LinkPreview url={firstUrl} />}
          </>
        )}

        {grouped.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {grouped.map(({ emoji, users, count }) => {
              const hasReacted = users.includes(username);
              return (
                <motion.button
                  key={emoji}
                  onClick={() => toggleReaction(emoji)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.85 }}
                  title={users.join(", ")}
                  className={`reaction-enter inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-all cursor-pointer ${hasReacted ? "bg-accent/15 border border-accent/30 shadow-sm shadow-accent/10" : "bg-surface/80 border border-border hover:border-border-bright hover:bg-surface-hover"}`}
                >
                  <span className="text-sm">{emoji}</span>
                  <span className={hasReacted ? "text-accent font-semibold" : "text-muted"}>{count}</span>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile: three-dot dropdown */}
      <div className="md:hidden relative shrink-0 self-start mt-1" ref={menuRef}>
        <motion.button
          onClick={() => {
            if (!showMenu) {
              const rect = menuRef.current?.getBoundingClientRect();
              setMenuFlip(rect ? rect.bottom + 200 > window.innerHeight : false);
            }
            setShowMenu(!showMenu); setShowReactions(false); setConfirmDelete(false);
          }}
          whileTap={{ scale: 0.9 }}
          className="text-muted/50 hover:text-muted text-sm transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-surface-hover/50"
        >
          ⋯
        </motion.button>

        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: menuFlip ? 4 : -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: menuFlip ? 4 : -4 }}
              transition={{ duration: 0.15 }}
              className={`absolute right-0 glass-strong rounded-xl border border-border glow z-20 min-w-[140px] overflow-hidden ${menuFlip ? "bottom-full mb-1" : "top-full mt-1"}`}
            >
              <button onClick={() => setShowReactions(!showReactions)} className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-foreground/70 hover:bg-surface-hover/50 hover:text-foreground transition-colors cursor-pointer">
                <span className="text-sm">😊</span> React
              </button>
              {onReply && !message.id.startsWith("temp-") && (
                <button onClick={() => { onReply(message); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-foreground/70 hover:bg-surface-hover/50 hover:text-foreground transition-colors cursor-pointer">
                  <span className="text-sm">↩️</span> Reply
                </button>
              )}
              {canEdit && (
                <button onClick={() => { setIsEditing(true); setEditText(message.content); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-foreground/70 hover:bg-surface-hover/50 hover:text-foreground transition-colors cursor-pointer">
                  <span className="text-sm">✏️</span> Edit
                </button>
              )}
              {isAdmin && onPin && (
                <button onClick={() => { onPin(message.id, !message.is_pinned); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-foreground/70 hover:bg-surface-hover/50 hover:text-foreground transition-colors cursor-pointer">
                  <span className="text-sm">📌</span> {message.is_pinned ? "Unpin" : "Pin"}
                </button>
              )}
              {canDelete && !confirmDelete && (
                <button onClick={() => setConfirmDelete(true)} className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-pink/70 hover:bg-pink/10 hover:text-pink transition-colors cursor-pointer">
                  <span className="text-sm">🗑️</span> Delete
                </button>
              )}
              {confirmDelete && (
                <div className="flex items-center gap-2 px-3 py-2 bg-pink/5">
                  <span className="text-[10px] text-pink">Delete?</span>
                  <button onClick={deleteMessage} className="text-[10px] text-pink font-semibold cursor-pointer hover:text-pink/80">Yes</button>
                  <button onClick={() => setConfirmDelete(false)} className="text-[10px] text-muted cursor-pointer hover:text-foreground">No</button>
                </div>
              )}
              <AnimatePresence>
                {showReactions && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="border-t border-border overflow-hidden">
                    <div className="flex flex-wrap gap-0.5 p-2">
                      {REACTION_EMOJIS.map((emoji) => (
                        <motion.button key={emoji} onClick={() => toggleReaction(emoji)} whileHover={{ scale: 1.3, y: -2 }} whileTap={{ scale: 0.8 }} transition={{ type: "spring", stiffness: 500, damping: 15 }} className="text-lg cursor-pointer p-1 rounded-lg hover:bg-surface-hover transition-colors">
                          {emoji}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop: hover action bar */}
      <div
        ref={hoverBarRef}
        className={`hidden md:block absolute -top-3 right-3 z-20 transition-all duration-150 ${showReactions || confirmDelete ? "opacity-100" : "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"}`}
      >
        <div className="glass-strong rounded-lg border border-border shadow-lg flex items-center p-0.5 pointer-events-auto">
          <motion.button
            onClick={() => { setShowReactions(!showReactions); setConfirmDelete(false); }}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            className={`text-sm p-1.5 rounded-md transition-colors cursor-pointer ${showReactions ? "bg-accent/20 text-accent" : "text-foreground/50 hover:text-foreground hover:bg-surface-hover/60"}`}
            title="React"
          >
            😊
          </motion.button>
          {onReply && !message.id.startsWith("temp-") && (
            <motion.button
              onClick={() => { onReply(message); setShowReactions(false); setConfirmDelete(false); }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              className="text-sm p-1.5 rounded-md text-foreground/50 hover:text-foreground hover:bg-surface-hover/60 transition-colors cursor-pointer"
              title="Reply"
            >
              ↩️
            </motion.button>
          )}
          {canEdit && (
            <motion.button
              onClick={() => { setIsEditing(true); setEditText(message.content); setShowReactions(false); setConfirmDelete(false); }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              className="text-sm p-1.5 rounded-md text-foreground/50 hover:text-foreground hover:bg-surface-hover/60 transition-colors cursor-pointer"
              title="Edit"
            >
              ✏️
            </motion.button>
          )}
          {isAdmin && onPin && (
            <motion.button
              onClick={() => { onPin(message.id, !message.is_pinned); setShowReactions(false); setConfirmDelete(false); }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              className={`text-sm p-1.5 rounded-md transition-colors cursor-pointer ${message.is_pinned ? "text-amber-400 bg-amber-500/15" : "text-foreground/50 hover:text-foreground hover:bg-surface-hover/60"}`}
              title={message.is_pinned ? "Unpin" : "Pin"}
            >
              📌
            </motion.button>
          )}
          {canDelete && (
            <motion.button
              onClick={() => { setConfirmDelete(!confirmDelete); setShowReactions(false); }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              className={`text-sm p-1.5 rounded-md transition-colors cursor-pointer ${confirmDelete ? "text-pink bg-pink/15" : "text-foreground/50 hover:text-pink hover:bg-pink/10"}`}
              title="Delete"
            >
              🗑️
            </motion.button>
          )}
        </div>

        <AnimatePresence>
          {showReactions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full mt-1 glass-strong rounded-xl border border-border shadow-lg p-1.5 pointer-events-auto"
            >
              <div className="flex gap-0.5">
                {REACTION_EMOJIS.map((emoji) => (
                  <motion.button key={emoji} onClick={() => toggleReaction(emoji)} whileHover={{ scale: 1.3, y: -2 }} whileTap={{ scale: 0.8 }} transition={{ type: "spring", stiffness: 500, damping: 15 }} className="text-lg cursor-pointer p-1 rounded-lg hover:bg-surface-hover transition-colors">
                    {emoji}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {confirmDelete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full mt-1 glass-strong rounded-xl border border-pink/30 shadow-lg p-2 pointer-events-auto"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-pink font-medium">Delete?</span>
                <button onClick={deleteMessage} className="text-[10px] text-pink font-semibold cursor-pointer hover:text-pink/80 px-2 py-0.5 rounded bg-pink/10 hover:bg-pink/20 transition-colors">Yes</button>
                <button onClick={() => setConfirmDelete(false)} className="text-[10px] text-muted cursor-pointer hover:text-foreground px-2 py-0.5 rounded hover:bg-surface-hover transition-colors">No</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
