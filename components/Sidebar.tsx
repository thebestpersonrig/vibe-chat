"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Room, ROOM_EMOJIS } from "@/lib/types";

interface SidebarProps {
  rooms: Room[];
  activeRoomId: string | null;
  onSelectRoom: (room: Room) => void;
  username: string;
  avatarColor: string;
  onLogout: () => void;
  unreadCounts: Record<string, number>;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ rooms, activeRoomId, onSelectRoom, username, avatarColor, onLogout, unreadCounts, isOpen, onClose }: SidebarProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("💬");
  const [creating, setCreating] = useState(false);

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newRoomName.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    const { data, error } = await supabase.from("rooms").insert({ name: trimmed, emoji: selectedEmoji }).select().single();
    if (!error && data) { onSelectRoom(data); setNewRoomName(""); setShowCreate(false); onClose(); }
    setCreating(false);
  }

  function handleRoomClick(room: Room) { onSelectRoom(room); onClose(); }

  return (
    <>
      <AnimatePresence>
        {isOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden" />}
      </AnimatePresence>

      <div className={`fixed md:relative z-50 md:z-auto h-full w-72 flex flex-col glass-strong border-r border-border transition-transform duration-300 md:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <h1 className="text-base font-bold gradient-text">Radiant Power Batch</h1>
          </div>
          <button onClick={onClose} className="md:hidden text-muted hover:text-foreground cursor-pointer text-lg transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[10px] font-bold text-muted/60 uppercase tracking-[0.15em]">Rooms</span>
            <motion.button
              onClick={() => setShowCreate(!showCreate)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-6 h-6 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent flex items-center justify-center transition-colors cursor-pointer text-sm"
            >
              {showCreate ? "×" : "+"}
            </motion.button>
          </div>

          <AnimatePresence>
            {showCreate && (
              <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} onSubmit={handleCreateRoom} className="overflow-hidden">
                <div className="bg-surface/80 rounded-xl p-3 mb-3 border border-border glow">
                  <div className="input-glow rounded-lg transition-all mb-2">
                    <input type="text" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} placeholder="Room name..." maxLength={30} autoFocus className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/40 focus:outline-none transition-all" />
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {ROOM_EMOJIS.map((emoji) => (
                      <button key={emoji} type="button" onClick={() => setSelectedEmoji(emoji)} className={`text-sm p-1.5 rounded-lg cursor-pointer transition-all ${selectedEmoji === emoji ? "bg-accent/20 scale-110 ring-1 ring-accent/40" : "hover:bg-surface-hover"}`}>{emoji}</button>
                    ))}
                  </div>
                  <button type="submit" disabled={!newRoomName.trim() || creating} className="w-full text-xs bg-gradient-to-r from-accent to-pink hover:opacity-90 disabled:opacity-40 text-white py-2 rounded-lg transition-all cursor-pointer font-medium">{creating ? "Creating..." : "Create Room"}</button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {rooms.map((room) => {
            const unread = unreadCounts[room.id] || 0;
            const isActive = activeRoomId === room.id;
            return (
              <motion.button
                key={room.id}
                onClick={() => handleRoomClick(room)}
                whileTap={{ scale: 0.97 }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer hover-lift ${isActive ? "room-active text-foreground" : "text-muted hover:text-foreground hover:bg-surface-hover/50 border border-transparent"}`}
              >
                <span className={`text-lg transition-transform ${isActive ? "scale-110" : ""}`}>{room.emoji}</span>
                <span className="text-sm font-medium truncate flex-1">{room.name}</span>
                {unread > 0 && !isActive && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-gradient-to-r from-accent to-pink text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-lg shadow-accent/20"
                  >
                    {unread > 99 ? "99+" : unread}
                  </motion.span>
                )}
              </motion.button>
            );
          })}
          {rooms.length === 0 && <p className="text-muted/40 text-xs text-center py-8">No rooms yet — create one!</p>}
        </div>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-hover/30 transition-all">
            <div className="relative">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold avatar-ring" style={{ backgroundColor: avatarColor }}>{username[0].toUpperCase()}</div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald rounded-full border-2 border-surface online-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium truncate block">{username}</span>
              <span className="text-[10px] text-emerald">Online</span>
            </div>
            <button onClick={onLogout} className="text-muted hover:text-pink transition-colors text-xs cursor-pointer p-1.5 rounded-lg hover:bg-surface-hover" title="Log out">✕</button>
          </div>
        </div>
      </div>
    </>
  );
}
