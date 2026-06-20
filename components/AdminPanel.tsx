"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { User } from "@/lib/types";
import Avatar from "@/components/Avatar";

interface AdminPanelProps {
  allUsers: User[];
  onClose: () => void;
  onUpdate: () => void;
  onDeleteUser: (username: string) => void;
  onRenameUser: (oldUsername: string, newUsername: string) => Promise<boolean>;
  onBanUser: (username: string) => void;
  onUnbanUser: (username: string) => void;
  onPurgeMessages: (username: string) => void;
  onFingerprintBan: (username: string) => void;
  onFingerprintUnban: (username: string) => void;
}

const MUTE_DURATIONS = [
  { label: "5m", minutes: 5 },
  { label: "15m", minutes: 15 },
  { label: "1h", minutes: 60 },
  { label: "6h", minutes: 360 },
  { label: "24h", minutes: 1440 },
  { label: "7d", minutes: 10080 },
];

function getMuteStatus(user: User): { muted: boolean; remaining: string } {
  if (!user.muted_until) return { muted: false, remaining: "" };
  const until = new Date(user.muted_until).getTime();
  const now = Date.now();
  if (until <= now) return { muted: false, remaining: "" };
  const diff = until - now;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return { muted: true, remaining: `${secs}s left` };
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return { muted: true, remaining: `${mins}m left` };
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return { muted: true, remaining: `${hrs}h left` };
  return { muted: true, remaining: `${Math.floor(hrs / 24)}d left` };
}

export default function AdminPanel({ allUsers, onClose, onUpdate, onDeleteUser, onRenameUser, onBanUser, onUnbanUser, onPurgeMessages, onFingerprintBan, onFingerprintUnban }: AdminPanelProps) {
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [renameInput, setRenameInput] = useState("");
  const [renameError, setRenameError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<string | null>(null);
  const [confirmPurge, setConfirmPurge] = useState<string | null>(null);

  function startEditing(user: User) {
    if (editingUser === user.username) {
      setEditingUser(null);
      return;
    }
    setEditingUser(user.username);
    setTitleInput(user.title || "");
    setRenameInput(user.username);
    setRenameError("");
  }

  async function saveRename(oldUsername: string) {
    const trimmed = renameInput.trim();
    if (!trimmed || trimmed.length < 2) { setRenameError("Min 2 characters"); return; }
    if (trimmed === oldUsername) return;
    if (allUsers.some(u => u.username.toLowerCase() === trimmed.toLowerCase() && u.username !== oldUsername)) {
      setRenameError("Username taken");
      return;
    }
    setSaving(true);
    setRenameError("");
    const ok = await onRenameUser(oldUsername, trimmed);
    if (!ok) setRenameError("Rename failed");
    else setEditingUser(trimmed);
    setSaving(false);
  }

  async function saveTitle(username: string) {
    setSaving(true);
    await supabase.from("users").update({ title: titleInput || null }).eq("username", username);
    onUpdate();
    setSaving(false);
  }

  async function muteUser(username: string, minutes: number) {
    setSaving(true);
    const until = new Date(Date.now() + minutes * 60000).toISOString();
    await supabase.from("users").update({ muted_until: until }).eq("username", username);
    onUpdate();
    setSaving(false);
  }

  async function unmuteUser(username: string) {
    setSaving(true);
    await supabase.from("users").update({ muted_until: null }).eq("username", username);
    onUpdate();
    setSaving(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative w-full max-w-lg max-h-[80vh] flex flex-col glass-strong rounded-2xl glow-strong border border-border overflow-hidden"
      >
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">👑</span>
            <h2 className="text-sm font-bold gradient-text text-glow">Admin Panel</h2>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors cursor-pointer text-lg">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {allUsers.map((user) => {
            const isEditing = editingUser === user.username;
            const muteStatus = getMuteStatus(user);
            return (
              <div key={user.username}>
                <button
                  onClick={() => startEditing(user)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${isEditing ? "bg-surface-hover/60 ring-1 ring-accent/20" : "hover:bg-surface-hover/40"}`}
                >
                  <Avatar username={user.username} avatarColor={user.avatar_color} avatarUrl={user.avatar_url} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium truncate">{user.username}</span>
                      {user.is_admin && <span className="text-[9px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full font-bold">ADMIN</span>}
                      {user.title && <span className="text-[9px] bg-surface text-muted px-1.5 py-0.5 rounded-full border border-border truncate max-w-[100px]">{user.title}</span>}
                      {user.is_banned && <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-bold">BANNED</span>}
                      {muteStatus.muted && <span className="text-[9px] bg-pink/15 text-pink px-1.5 py-0.5 rounded-full font-medium">🔇 {muteStatus.remaining}</span>}
                    </div>
                    <span className="text-[10px] text-muted/50">{user.created_at ? new Date(user.created_at).toLocaleDateString() : ""}</span>
                  </div>
                  <span className="text-muted/40 text-xs">{isEditing ? "▲" : "▼"}</span>
                </button>

                <AnimatePresence>
                  {isEditing && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mx-2 mb-2 p-3 rounded-xl bg-surface/60 border border-border space-y-3">
                        <div>
                          <label className="text-[10px] text-muted/60 uppercase tracking-wider font-bold mb-1 block">Title</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={titleInput}
                              onChange={(e) => setTitleInput(e.target.value)}
                              placeholder="e.g. Navigator, Captain..."
                              maxLength={30}
                              className="flex-1 bg-background/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted/30 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all"
                            />
                            <button
                              onClick={() => saveTitle(user.username)}
                              disabled={saving}
                              className="text-[10px] bg-accent/20 hover:bg-accent/30 text-accent px-3 py-1.5 rounded-lg cursor-pointer transition-colors font-medium disabled:opacity-50"
                            >
                              Save
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] text-muted/60 uppercase tracking-wider font-bold mb-1 block">Rename</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={renameInput}
                              onChange={(e) => { setRenameInput(e.target.value); setRenameError(""); }}
                              maxLength={20}
                              className="flex-1 bg-background/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted/30 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all"
                            />
                            <button
                              onClick={() => saveRename(user.username)}
                              disabled={saving || renameInput.trim() === user.username}
                              className="text-[10px] bg-accent/20 hover:bg-accent/30 text-accent px-3 py-1.5 rounded-lg cursor-pointer transition-colors font-medium disabled:opacity-50"
                            >
                              Rename
                            </button>
                          </div>
                          {renameError && <p className="text-[10px] text-pink mt-1">{renameError}</p>}
                        </div>

                        <div>
                          <label className="text-[10px] text-muted/60 uppercase tracking-wider font-bold mb-1 block">
                            Mute {muteStatus.muted ? `— 🔇 ${muteStatus.remaining}` : ""}
                          </label>
                          <div className="flex gap-1.5 flex-wrap">
                            {MUTE_DURATIONS.map(({ label, minutes }) => (
                              <button
                                key={label}
                                onClick={() => muteUser(user.username, minutes)}
                                disabled={saving}
                                className="text-[10px] bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors font-medium disabled:opacity-50"
                              >
                                {label}
                              </button>
                            ))}
                            {muteStatus.muted && (
                              <button
                                onClick={() => unmuteUser(user.username)}
                                disabled={saving}
                                className="text-[10px] bg-emerald/20 hover:bg-emerald/30 text-emerald px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors font-medium disabled:opacity-50"
                              >
                                Unmute
                              </button>
                            )}
                          </div>
                        </div>

                        {!user.is_admin && (
                          <div>
                            <label className="text-[10px] text-muted/60 uppercase tracking-wider font-bold mb-1 block">
                              Danger Zone
                            </label>
                            <div className="flex gap-1.5 flex-wrap mb-2">
                              {user.is_banned ? (
                                <>
                                  <button
                                    onClick={() => { onUnbanUser(user.username); }}
                                    disabled={saving}
                                    className="text-[10px] bg-emerald/20 hover:bg-emerald/30 text-emerald px-3 py-1.5 rounded-lg cursor-pointer transition-colors font-medium disabled:opacity-50"
                                  >
                                    Unban
                                  </button>
                                  <button
                                    onClick={() => { onFingerprintUnban(user.username); }}
                                    disabled={saving}
                                    className="text-[10px] bg-emerald/20 hover:bg-emerald/30 text-emerald px-3 py-1.5 rounded-lg cursor-pointer transition-colors font-medium disabled:opacity-50"
                                  >
                                    Unban Device
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => { onBanUser(user.username); }}
                                    disabled={saving}
                                    className="text-[10px] bg-red-500/15 hover:bg-red-500/25 text-red-400 px-3 py-1.5 rounded-lg cursor-pointer transition-colors font-medium disabled:opacity-50"
                                  >
                                    Ban
                                  </button>
                                  <button
                                    onClick={() => { onFingerprintBan(user.username); }}
                                    disabled={saving}
                                    className="text-[10px] bg-red-500/15 hover:bg-red-500/25 text-red-400 px-3 py-1.5 rounded-lg cursor-pointer transition-colors font-medium disabled:opacity-50"
                                  >
                                    Ban Device
                                  </button>
                                </>
                              )}
                            </div>
                            <div className="flex gap-1.5 flex-wrap mb-2">
                              {confirmPurge === user.username ? (
                                <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                  <span className="text-[10px] text-orange-400">Purge all messages from {user.username}?</span>
                                  <button onClick={() => { onPurgeMessages(user.username); setConfirmPurge(null); }} className="text-[10px] text-orange-400 font-semibold cursor-pointer hover:text-orange-300">Yes</button>
                                  <button onClick={() => setConfirmPurge(null)} className="text-[10px] text-muted cursor-pointer hover:text-foreground">No</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmPurge(user.username)}
                                  disabled={saving}
                                  className="text-[10px] bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 px-3 py-1.5 rounded-lg cursor-pointer transition-colors font-medium disabled:opacity-50"
                                >
                                  Purge Messages
                                </button>
                              )}
                            </div>
                            {confirmDeleteUser === user.username ? (
                              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                <span className="text-[10px] text-red-400">Delete {user.username}?</span>
                                <button onClick={() => { onDeleteUser(user.username); setConfirmDeleteUser(null); setEditingUser(null); }} className="text-[10px] text-red-400 font-semibold cursor-pointer hover:text-red-300">Yes</button>
                                <button onClick={() => setConfirmDeleteUser(null)} className="text-[10px] text-muted cursor-pointer hover:text-foreground">No</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteUser(user.username)}
                                disabled={saving}
                                className="text-[10px] bg-red-500/15 hover:bg-red-500/25 text-red-400 px-3 py-1.5 rounded-lg cursor-pointer transition-colors font-medium disabled:opacity-50"
                              >
                                Delete Account
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
