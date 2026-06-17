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
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return { muted: true, remaining: `${mins}m left` };
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return { muted: true, remaining: `${hrs}h left` };
  return { muted: true, remaining: `${Math.floor(hrs / 24)}d left` };
}

export default function AdminPanel({ allUsers, onClose, onUpdate }: AdminPanelProps) {
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [salaryInput, setSalaryInput] = useState("");
  const [saving, setSaving] = useState(false);

  function startEditing(user: User) {
    if (editingUser === user.username) {
      setEditingUser(null);
      return;
    }
    setEditingUser(user.username);
    setTitleInput(user.title || "");
    setSalaryInput("");
  }

  async function saveTitle(username: string) {
    setSaving(true);
    await supabase.from("users").update({ title: titleInput || null }).eq("username", username);
    onUpdate();
    setSaving(false);
  }

  async function adjustBalance(username: string, amount: number) {
    if (!amount || isNaN(amount)) return;
    setSaving(true);
    const user = allUsers.find((u) => u.username === username);
    const newBalance = Math.max(0, (user?.balance || 0) + amount);
    await supabase.from("users").update({ balance: newBalance }).eq("username", username);
    setSalaryInput("");
    onUpdate();
    setSaving(false);
  }

  async function setBalance(username: string, amount: number) {
    if (isNaN(amount) || amount < 0) return;
    setSaving(true);
    await supabase.from("users").update({ balance: amount }).eq("username", username);
    setSalaryInput("");
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

  async function toggleBan(user: User) {
    setSaving(true);
    await supabase.from("users").update({ is_banned: !user.is_banned }).eq("username", user.username);
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
            <h2 className="text-sm font-bold gradient-text">Admin Panel</h2>
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
                      {muteStatus.muted && <span className="text-[9px] bg-pink/15 text-pink px-1.5 py-0.5 rounded-full font-medium">🔇 {muteStatus.remaining}</span>}
                      {user.is_banned && <span className="text-[9px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-full font-bold">BANNED</span>}
                    </div>
                    <span className="text-[10px] text-muted/50">💰 {user.balance || 0}</span>
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
                          <label className="text-[10px] text-muted/60 uppercase tracking-wider font-bold mb-1 block">
                            Salary — Current: 💰 {user.balance || 0}
                          </label>
                          <div className="flex gap-1.5">
                            <input
                              type="number"
                              value={salaryInput}
                              onChange={(e) => setSalaryInput(e.target.value)}
                              placeholder="Amount"
                              min="0"
                              className="flex-1 bg-background/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted/30 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all"
                            />
                            <button
                              onClick={() => adjustBalance(user.username, parseInt(salaryInput) || 0)}
                              disabled={saving || !salaryInput}
                              className="text-[10px] bg-emerald/20 hover:bg-emerald/30 text-emerald px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors font-medium disabled:opacity-50"
                            >
                              Give
                            </button>
                            <button
                              onClick={() => adjustBalance(user.username, -(parseInt(salaryInput) || 0))}
                              disabled={saving || !salaryInput}
                              className="text-[10px] bg-pink/20 hover:bg-pink/30 text-pink px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors font-medium disabled:opacity-50"
                            >
                              Take
                            </button>
                            <button
                              onClick={() => setBalance(user.username, parseInt(salaryInput) || 0)}
                              disabled={saving || !salaryInput}
                              className="text-[10px] bg-blue/20 hover:bg-blue/30 text-blue px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors font-medium disabled:opacity-50"
                              title="Set balance to this exact amount"
                            >
                              Set
                            </button>
                          </div>
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
                              Ban
                            </label>
                            <button
                              onClick={() => toggleBan(user)}
                              disabled={saving}
                              className={`text-[10px] px-3 py-1.5 rounded-lg cursor-pointer transition-colors font-medium disabled:opacity-50 ${user.is_banned ? "bg-emerald/20 hover:bg-emerald/30 text-emerald" : "bg-red-500/15 hover:bg-red-500/25 text-red-400"}`}
                            >
                              {user.is_banned ? "Unban User" : "Ban User"}
                            </button>
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
