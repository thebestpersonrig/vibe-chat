"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, uploadImage } from "@/lib/supabase";
import { Room, User, ROOM_EMOJIS } from "@/lib/types";
import Avatar from "@/components/Avatar";

interface SidebarProps {
  rooms: Room[];
  activeRoomId: string | null;
  onSelectRoom: (room: Room) => void;
  username: string;
  avatarColor: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  allUsers: User[];
  onAvatarChange: (url: string) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onDeleteRoom: (roomId: string) => void;
  onStartDm: (targetUser: string) => void;
  onStartGroupDm: (users: string[]) => void;
  onOpenAdminPanel: () => void;
  unreadCounts: Record<string, number>;
  dmNames: Record<string, string>;
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onPasswordChange: (newPassword: string) => Promise<boolean>;
}

export default function Sidebar({ rooms, activeRoomId, onSelectRoom, username, avatarColor, avatarUrl, isAdmin, allUsers, onAvatarChange, onLogout, onDeleteAccount, onDeleteRoom, onStartDm, onStartGroupDm, onOpenAdminPanel, unreadCounts, dmNames, isOpen, onClose, soundEnabled, onToggleSound, onPasswordChange }: SidebarProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [showDmPicker, setShowDmPicker] = useState(false);
  const [showGroupDmPicker, setShowGroupDmPicker] = useState(false);
  const [groupDmSelected, setGroupDmSelected] = useState<string[]>([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("💬");
  const [creating, setCreating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [confirmDeleteRoom, setConfirmDeleteRoom] = useState<string | null>(null);
  const [dmSearch, setDmSearch] = useState("");
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const groupRooms = rooms.filter((r) => r.type !== "dm");
  const dmRooms = rooms.filter((r) => r.type === "dm");
  const currentUserData = allUsers.find((u) => u.username === username);

  const dmableUsers = allUsers.filter(
    (u) => u.username !== username && u.username.toLowerCase().includes(dmSearch.toLowerCase())
  );

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newRoomName.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    const { data, error } = await supabase.from("rooms").insert({ name: trimmed, emoji: selectedEmoji, type: "group" }).select().single();
    if (!error && data) { onSelectRoom(data); setNewRoomName(""); setShowCreate(false); onClose(); }
    setCreating(false);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError("");
    if (file.size > 5 * 1024 * 1024) { setAvatarError("Max 5MB"); return; }
    setUploadingAvatar(true);
    const url = await uploadImage(file);
    if (url) {
      const { error } = await supabase.from("users").update({ avatar_url: url }).eq("username", username);
      if (error) setAvatarError("Failed to save");
      else onAvatarChange(url);
    } else {
      setAvatarError("Upload failed — see console");
    }
    setUploadingAvatar(false);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  function handleRoomClick(room: Room) { onSelectRoom(room); onClose(); }

  function getDmDisplayName(room: Room) {
    return dmNames[room.id] || room.name;
  }

  function toggleGroupDmUser(u: string) {
    setGroupDmSelected((prev) => prev.includes(u) ? prev.filter((x) => x !== u) : [...prev, u]);
  }

  function handleCreateGroupDm() {
    if (groupDmSelected.length < 2) return;
    onStartGroupDm(groupDmSelected);
    setGroupDmSelected([]);
    setShowGroupDmPicker(false);
    onClose();
  }

  async function handlePasswordSubmit() {
    setPasswordError("");
    if (newPassword.length < 4) { setPasswordError("Min 4 characters"); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords don't match"); return; }
    setPasswordSaving(true);
    const ok = await onPasswordChange(newPassword);
    setPasswordSaving(false);
    if (ok) {
      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => { setPasswordSuccess(false); setShowPasswordChange(false); }, 1500);
    } else {
      setPasswordError("Failed to update");
    }
  }

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

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* DMs Section */}
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] font-bold text-muted/60 uppercase tracking-[0.15em]">Direct Messages</span>
            <div className="flex items-center gap-1">
              <motion.button
                onClick={() => { setShowGroupDmPicker(!showGroupDmPicker); setShowDmPicker(false); setGroupDmSelected([]); setDmSearch(""); }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-6 h-6 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent flex items-center justify-center transition-colors cursor-pointer text-[9px] font-bold"
                title="Group DM"
              >
                {showGroupDmPicker ? "×" : "G"}
              </motion.button>
              <motion.button
                onClick={() => { setShowDmPicker(!showDmPicker); setShowGroupDmPicker(false); setDmSearch(""); }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-6 h-6 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent flex items-center justify-center transition-colors cursor-pointer text-sm"
              >
                {showDmPicker ? "×" : "+"}
              </motion.button>
            </div>
          </div>

          {/* Group DM picker */}
          <AnimatePresence>
            {showGroupDmPicker && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="bg-surface/80 rounded-xl p-3 mb-2 border border-border glow">
                  <p className="text-[10px] text-muted/60 mb-2">Select 2+ users for a group DM</p>
                  <div className="input-glow rounded-lg transition-all mb-2">
                    <input type="text" value={dmSearch} onChange={(e) => setDmSearch(e.target.value)} placeholder="Search users..." autoFocus className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/40 focus:outline-none transition-all" />
                  </div>
                  {groupDmSelected.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {groupDmSelected.map((u) => (
                        <span key={u} onClick={() => toggleGroupDmUser(u)} className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full cursor-pointer hover:bg-accent/30 transition-colors">{u} ✕</span>
                      ))}
                    </div>
                  )}
                  <div className="max-h-36 overflow-y-auto space-y-0.5">
                    {dmableUsers.map((user) => {
                      const selected = groupDmSelected.includes(user.username);
                      return (
                        <button key={user.username} onClick={() => toggleGroupDmUser(user.username)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all cursor-pointer text-left ${selected ? "bg-accent/15 ring-1 ring-accent/30" : "hover:bg-surface-hover/50"}`}>
                          <Avatar username={user.username} avatarColor={user.avatar_color} avatarUrl={user.avatar_url} size="sm" />
                          <span className="text-xs truncate flex-1">{user.username}</span>
                          {selected && <span className="text-accent text-xs">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={handleCreateGroupDm}
                    disabled={groupDmSelected.length < 2}
                    className="w-full mt-2 text-[10px] bg-gradient-to-r from-accent to-pink hover:opacity-90 disabled:opacity-30 text-white py-2 rounded-lg transition-all cursor-pointer font-medium"
                  >
                    Create Group DM ({groupDmSelected.length} selected)
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Regular DM picker */}
          <AnimatePresence>
            {showDmPicker && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="bg-surface/80 rounded-xl p-3 mb-2 border border-border glow">
                  <div className="input-glow rounded-lg transition-all mb-2">
                    <input type="text" value={dmSearch} onChange={(e) => setDmSearch(e.target.value)} placeholder="Search users..." autoFocus className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/40 focus:outline-none transition-all" />
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-0.5">
                    {dmableUsers.map((user) => (
                      <button key={user.username} onClick={() => { onStartDm(user.username); setShowDmPicker(false); onClose(); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-hover/50 transition-all cursor-pointer text-left">
                        <Avatar username={user.username} avatarColor={user.avatar_color} avatarUrl={user.avatar_url} size="sm" />
                        <span className="text-xs truncate">{user.username}</span>
                      </button>
                    ))}
                    {dmableUsers.length === 0 && <p className="text-muted/40 text-xs text-center py-2">No users found</p>}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {dmRooms.map((room) => {
            const unread = unreadCounts[room.id] || 0;
            const isActive = activeRoomId === room.id;
            const displayName = getDmDisplayName(room);
            const otherUser = allUsers.find((u) => u.username === displayName);
            return (
              <motion.button
                key={room.id}
                onClick={() => handleRoomClick(room)}
                whileTap={{ scale: 0.97 }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all cursor-pointer hover-lift ${isActive ? "room-active text-foreground" : "text-muted hover:text-foreground hover:bg-surface-hover/50 border border-transparent"}`}
              >
                <Avatar username={displayName} avatarColor={otherUser?.avatar_color || "#8B5CF6"} avatarUrl={otherUser?.avatar_url} size="sm" />
                <span className="text-sm font-medium truncate flex-1">{displayName}</span>
                {unread > 0 && !isActive && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-gradient-to-r from-accent to-pink text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-lg shadow-accent/20">
                    {unread > 99 ? "99+" : unread}
                  </motion.span>
                )}
              </motion.button>
            );
          })}
          {dmRooms.length === 0 && !showDmPicker && !showGroupDmPicker && <p className="text-muted/40 text-[11px] text-center py-3">No DMs yet</p>}

          <div className="divider-glow my-3" />

          {/* Rooms Section */}
          <div className="flex items-center justify-between mb-2 px-1">
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

          {groupRooms.map((room) => {
            const unread = unreadCounts[room.id] || 0;
            const isActive = activeRoomId === room.id;
            return (
              <div key={room.id} className="group/room relative">
                <motion.button
                  onClick={() => handleRoomClick(room)}
                  whileTap={{ scale: 0.97 }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer hover-lift ${isActive ? "room-active text-foreground" : "text-muted hover:text-foreground hover:bg-surface-hover/50 border border-transparent"}`}
                >
                  <span className={`text-lg transition-transform ${isActive ? "scale-110" : ""}`}>{room.emoji}</span>
                  <span className="text-sm font-medium truncate flex-1">{room.name}</span>
                  {unread > 0 && !isActive && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-gradient-to-r from-accent to-pink text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-lg shadow-accent/20">
                      {unread > 99 ? "99+" : unread}
                    </motion.span>
                  )}
                </motion.button>
                {isAdmin && (
                  <button
                    onClick={() => setConfirmDeleteRoom(confirmDeleteRoom === room.id ? null : room.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/room:opacity-100 text-muted hover:text-pink text-[10px] p-1 rounded transition-all cursor-pointer"
                    title="Delete room"
                  >
                    🗑️
                  </button>
                )}
                <AnimatePresence>
                  {confirmDeleteRoom === room.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="mx-2 mb-1 p-2 rounded-lg bg-pink/10 border border-pink/20 flex items-center gap-2">
                        <span className="text-[10px] text-pink">Delete room?</span>
                        <button onClick={() => { onDeleteRoom(room.id); setConfirmDeleteRoom(null); }} className="text-[10px] text-pink font-semibold cursor-pointer hover:text-pink/80">Yes</button>
                        <button onClick={() => setConfirmDeleteRoom(null)} className="text-[10px] text-muted cursor-pointer hover:text-foreground">No</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          {groupRooms.length === 0 && <p className="text-muted/40 text-xs text-center py-4">No rooms yet — create one!</p>}
        </div>

        <div className="p-3 border-t border-border space-y-2">
          {isAdmin && (
            <button
              onClick={onOpenAdminPanel}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent text-xs font-medium transition-all cursor-pointer border border-accent/20"
            >
              <span>👑</span> Admin Panel
            </button>
          )}

          {/* Sound toggle + password change row */}
          <div className="flex gap-1.5">
            <button
              onClick={onToggleSound}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-[10px] font-medium transition-all cursor-pointer border ${soundEnabled ? "bg-emerald/10 border-emerald/20 text-emerald hover:bg-emerald/20" : "bg-surface/50 border-border text-muted hover:bg-surface-hover"}`}
            >
              {soundEnabled ? "🔊 Sound On" : "🔇 Sound Off"}
            </button>
            <button
              onClick={() => { setShowPasswordChange(!showPasswordChange); setPasswordError(""); setPasswordSuccess(false); setNewPassword(""); setConfirmPassword(""); }}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-[10px] font-medium transition-all cursor-pointer border bg-surface/50 border-border text-muted hover:bg-surface-hover"
            >
              🔑 Password
            </button>
          </div>

          <AnimatePresence>
            {showPasswordChange && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="p-3 rounded-xl bg-surface/60 border border-border space-y-2">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password..."
                    minLength={4}
                    className="w-full bg-background/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted/30 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password..."
                    minLength={4}
                    className="w-full bg-background/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted/30 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all"
                  />
                  {passwordError && <p className="text-[10px] text-pink">{passwordError}</p>}
                  {passwordSuccess && <p className="text-[10px] text-emerald">Password updated!</p>}
                  <button
                    onClick={handlePasswordSubmit}
                    disabled={passwordSaving || !newPassword || !confirmPassword}
                    className="w-full text-[10px] bg-accent/20 hover:bg-accent/30 text-accent py-1.5 rounded-lg cursor-pointer transition-colors font-medium disabled:opacity-50"
                  >
                    {passwordSaving ? "Saving..." : "Update Password"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-hover/30 transition-all">
            <button onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar} className="cursor-pointer group relative" title="Change avatar">
              <Avatar username={username} avatarColor={avatarColor} avatarUrl={avatarUrl} size="md" showStatus />
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-white text-[10px]">{uploadingAvatar ? "..." : "📷"}</span>
              </div>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-medium truncate">{username}</span>
                {isAdmin && <span className="text-[9px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full font-bold">ADMIN</span>}
                {currentUserData?.title && <span className="text-[9px] bg-surface text-muted px-1.5 py-0.5 rounded-full border border-border">{currentUserData.title}</span>}
              </div>
              <div className="flex items-center gap-2">
                {avatarError ? (
                  <span className="text-[10px] text-pink">{avatarError}</span>
                ) : (
                  <span className="text-[10px] text-emerald">Online</span>
                )}
                <span className="text-[10px] text-muted/50">💰 {currentUserData?.balance || 0}</span>
              </div>
            </div>
            <button onClick={onLogout} className="text-muted hover:text-foreground transition-colors text-xs cursor-pointer p-1.5 rounded-lg hover:bg-surface-hover" title="Log out">↩</button>
            <button onClick={() => setConfirmDeleteAccount(true)} className="text-muted hover:text-pink transition-colors text-xs cursor-pointer p-1.5 rounded-lg hover:bg-surface-hover" title="Delete account">🗑️</button>
          </div>
          <AnimatePresence>
            {confirmDeleteAccount && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="mt-2 p-3 rounded-xl bg-pink/10 border border-pink/20">
                  <p className="text-xs text-pink mb-2">Delete your account permanently?</p>
                  <div className="flex gap-2">
                    <button onClick={() => { setConfirmDeleteAccount(false); onDeleteAccount(); }} className="flex-1 text-xs bg-pink/20 hover:bg-pink/30 text-pink py-1.5 rounded-lg cursor-pointer transition-colors font-medium">Delete</button>
                    <button onClick={() => setConfirmDeleteAccount(false)} className="flex-1 text-xs bg-surface hover:bg-surface-hover text-muted py-1.5 rounded-lg cursor-pointer transition-colors">Cancel</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
