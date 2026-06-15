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
}

export default function Sidebar({
  rooms,
  activeRoomId,
  onSelectRoom,
  username,
  avatarColor,
  onLogout,
}: SidebarProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("💬");
  const [creating, setCreating] = useState(false);

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newRoomName.trim();
    if (!trimmed || creating) return;

    setCreating(true);
    const { data, error } = await supabase
      .from("rooms")
      .insert({ name: trimmed, emoji: selectedEmoji })
      .select()
      .single();

    if (!error && data) {
      onSelectRoom(data);
      setNewRoomName("");
      setShowCreate(false);
    }
    setCreating(false);
  }

  return (
    <div className="w-72 h-full flex flex-col glass border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-bold gradient-text">Vibe Chat</h1>
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">Rooms</span>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="text-muted hover:text-accent transition-colors text-lg leading-none cursor-pointer"
            title="Create room"
          >
            {showCreate ? "×" : "+"}
          </button>
        </div>

        <AnimatePresence>
          {showCreate && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleCreateRoom}
              className="overflow-hidden"
            >
              <div className="bg-surface rounded-xl p-3 mb-2 border border-border">
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Room name..."
                  maxLength={30}
                  autoFocus
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted/50 focus:outline-none mb-2"
                />
                <div className="flex flex-wrap gap-1 mb-2">
                  {ROOM_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedEmoji(emoji)}
                      className={`text-base p-1 rounded cursor-pointer transition-all ${
                        selectedEmoji === emoji
                          ? "bg-accent/20 scale-110"
                          : "hover:bg-surface-hover"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={!newRoomName.trim() || creating}
                  className="w-full text-xs bg-accent hover:bg-accent-hover disabled:opacity-50 text-white py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  {creating ? "Creating..." : "Create Room"}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {rooms.map((room) => (
          <motion.button
            key={room.id}
            onClick={() => onSelectRoom(room)}
            whileTap={{ scale: 0.98 }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
              activeRoomId === room.id
                ? "bg-accent/15 text-foreground border border-accent/30"
                : "text-muted hover:text-foreground hover:bg-surface-hover border border-transparent"
            }`}
          >
            <span className="text-lg">{room.emoji}</span>
            <span className="text-sm font-medium truncate">{room.name}</span>
          </motion.button>
        ))}

        {rooms.length === 0 && (
          <p className="text-muted/50 text-xs text-center py-8">
            No rooms yet — create one!
          </p>
        )}
      </div>

      {/* User info */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {username[0].toUpperCase()}
          </div>
          <span className="text-sm font-medium truncate flex-1">{username}</span>
          <button
            onClick={onLogout}
            className="text-muted hover:text-red-400 transition-colors text-xs cursor-pointer"
            title="Log out"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
