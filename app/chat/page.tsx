"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, uploadImage } from "@/lib/supabase";
import { Room, Message as MessageType, Reaction, UserPresence, User, AVATAR_COLORS } from "@/lib/types";
import { playMessageSound, playMentionSound } from "@/lib/sounds";
import { hashPassword } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import MessageComp from "@/components/Message";
import MentionInput from "@/components/MentionInput";
import OnlineUsers from "@/components/OnlineUsers";
import TypingIndicator from "@/components/TypingIndicator";
import GifPicker from "@/components/GifPicker";

export default function ChatPage() {
  const [username, setUsername] = useState("");
  const [avatarColor, setAvatarColor] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [newMsgCount, setNewMsgCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loginError, setLoginError] = useState("");
  const [loginChecking, setLoginChecking] = useState(false);
  const [loginStep, setLoginStep] = useState<"username" | "password">("username");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginIsNew, setLoginIsNew] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [dmNames, setDmNames] = useState<Record<string, string>>({});

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const hasSetInitialRoom = useRef(false);
  const activeRoomRef = useRef<Room | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  activeRoomRef.current = activeRoom;

  useEffect(() => {
    async function init() {
      const stored = localStorage.getItem("rpb-user");
      if (stored) {
        const parsed = JSON.parse(stored);
        const { data } = await supabase.from("users").select("*").eq("username", parsed.username).single();
        if (!data) {
          localStorage.removeItem("rpb-user");
          setLoading(false);
          return;
        }
        setUsername(parsed.username);
        setAvatarColor(parsed.avatarColor);
        setAvatarUrl(parsed.avatarUrl || null);
        setIsAdmin(data.is_admin || false);
      }
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (!username) return;
    loadRooms();
    loadAllUsers();

    const roomSub = supabase
      .channel("rooms-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "rooms" }, async (payload) => {
        const room = payload.new as Room;
        if (room.type === "dm") {
          const { data: members } = await supabase.from("room_members").select("username").eq("room_id", room.id);
          if (!members?.some((m) => m.username === username)) return;
          const other = members.find((m) => m.username !== username);
          if (other) setDmNames((prev) => ({ ...prev, [room.id]: other.username }));
        }
        setRooms((prev) => [...prev, room]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "rooms" }, (payload) => {
        const deletedId = (payload.old as { id: string }).id;
        setRooms((prev) => prev.filter((r) => r.id !== deletedId));
        setActiveRoom((prev) => prev?.id === deletedId ? null : prev);
      })
      .subscribe();

    const globalMsgSub = supabase
      .channel("global-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as MessageType;
        if (msg.username === username) return;
        const current = activeRoomRef.current;
        if (!current || msg.room_id !== current.id) {
          setUnreadCounts((prev) => ({ ...prev, [msg.room_id]: (prev[msg.room_id] || 0) + 1 }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomSub);
      supabase.removeChannel(globalMsgSub);
    };
  }, [username]);

  async function loadRooms() {
    const { data } = await supabase.from("rooms").select("*").order("created_at");
    if (!data) return;

    const { data: members } = await supabase.from("room_members").select("*");
    const myDmRoomIds = new Set(
      (members || []).filter((m) => m.username === username).map((m) => m.room_id)
    );

    const visible = data.filter((r) => r.type !== "dm" || myDmRoomIds.has(r.id));

    const names: Record<string, string> = {};
    for (const room of visible) {
      if (room.type === "dm") {
        const roomMembers = (members || []).filter((m) => m.room_id === room.id);
        const other = roomMembers.find((m) => m.username !== username);
        names[room.id] = other?.username || room.name;
      }
    }
    setDmNames(names);
    setRooms(visible);

    if (!hasSetInitialRoom.current && visible.length > 0) {
      hasSetInitialRoom.current = true;
      const firstGroup = visible.find((r) => r.type !== "dm");
      setActiveRoom(firstGroup || visible[0]);
    }
  }

  async function loadAllUsers() {
    const { data } = await supabase.from("users").select("*").order("username");
    if (data) setAllUsers(data);
  }

  useEffect(() => {
    if (!activeRoom || !username) return;
    setMessages([]);
    loadMessages(activeRoom.id);
    setNewMsgCount(0);
    setUnreadCounts((prev) => ({ ...prev, [activeRoom.id]: 0 }));

    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase.channel(`room:${activeRoom.id}`);

    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${activeRoom.id}` }, (payload) => {
        const newMsg = { ...payload.new as MessageType, reactions: [] };
        if (newMsg.username === username) return;
        setMessages((prev) => [...prev, newMsg]);
        if (newMsg.content.toLowerCase().includes(`@${username.toLowerCase()}`)) {
          playMentionSound();
          if (Notification.permission === "granted") {
            new Notification(`${newMsg.username} mentioned you`, { body: newMsg.content, icon: "/favicon.ico" });
          }
        } else {
          playMessageSound();
        }
        if (isNearBottomRef.current) {
          setTimeout(() => scrollToBottom(), 50);
        } else {
          setNewMsgCount((c) => c + 1);
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (payload) => {
        setMessages((prev) => prev.filter((m) => m.id !== (payload.old as { id: string }).id));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const reaction = payload.new as Reaction;
          setMessages((prev) => prev.map((m) => m.id === reaction.message_id ? { ...m, reactions: [...(m.reactions || []), reaction] } : m));
        } else if (payload.eventType === "DELETE") {
          const old = payload.old as { id: string };
          setMessages((prev) => prev.map((m) => ({ ...m, reactions: (m.reactions || []).filter((r) => r.id !== old.id) })));
        }
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users: UserPresence[] = [];
        Object.values(state).forEach((presences) => {
          (presences as unknown as UserPresence[]).forEach((p) => {
            if (!users.find((u) => u.username === p.username)) users.push(p);
          });
        });
        setOnlineUsers(users);
      })
      .on("broadcast", { event: "typing" }, ({ payload: p }) => {
        if (p.username === username) return;
        setTypingUsers((prev) => prev.includes(p.username) ? prev : [...prev, p.username]);
        setTimeout(() => setTypingUsers((prev) => prev.filter((u) => u !== p.username)), 3000);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ username, avatar_color: avatarColor, avatar_url: avatarUrl, online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [activeRoom?.id, username]);

  async function loadMessages(roomId: string) {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: msgs } = await supabase
      .from("messages")
      .select("*, reactions(*)")
      .eq("room_id", roomId)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: true })
      .limit(200);
    if (msgs) {
      setMessages(msgs);
      setTimeout(() => scrollToBottom(true), 50);
    }
  }

  function scrollToBottom(instant = false) {
    messagesContainerRef.current?.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: instant ? "instant" : "smooth" });
  }

  function handleScroll() {
    const el = messagesContainerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    isNearBottomRef.current = nearBottom;
    if (nearBottom) setNewMsgCount(0);
  }

  async function sendMessage() {
    const content = newMessage.trim();
    if (!content || !activeRoom) return;
    setNewMessage("");

    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: tempId,
      room_id: activeRoom.id,
      username,
      avatar_color: avatarColor,
      avatar_url: avatarUrl,
      content,
      created_at: new Date().toISOString(),
      reactions: [],
    }]);
    if (isNearBottomRef.current) setTimeout(() => scrollToBottom(), 20);

    const { data, error } = await supabase
      .from("messages")
      .insert({ room_id: activeRoom.id, username, avatar_color: avatarColor, avatar_url: avatarUrl, content })
      .select()
      .single();

    if (data) {
      setMessages((prev) => prev.map((m) => m.id === tempId ? { ...data, reactions: [] } : m));
    } else if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  }

  async function sendMediaMessage(url: string) {
    if (!activeRoom) return;

    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: tempId,
      room_id: activeRoom.id,
      username,
      avatar_color: avatarColor,
      avatar_url: avatarUrl,
      content: url,
      created_at: new Date().toISOString(),
      reactions: [],
    }]);
    if (isNearBottomRef.current) setTimeout(() => scrollToBottom(), 20);

    const { data, error } = await supabase
      .from("messages")
      .insert({ room_id: activeRoom.id, username, avatar_color: avatarColor, avatar_url: avatarUrl, content: url })
      .select()
      .single();

    if (data) {
      setMessages((prev) => prev.map((m) => m.id === tempId ? { ...data, reactions: [] } : m));
    } else if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadImage(file);
    if (url) await sendMediaMessage(url);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function broadcastTyping() {
    if (typingTimeoutRef.current) return;
    channelRef.current?.send({ type: "broadcast", event: "typing", payload: { username } });
    typingTimeoutRef.current = setTimeout(() => { typingTimeoutRef.current = null; }, 2000);
  }

  function isGrouped(index: number): boolean {
    if (index === 0) return false;
    const prev = messages[index - 1];
    const curr = messages[index];
    if (prev.username !== curr.username) return false;
    return new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime() < 120000;
  }

  async function handleStartDm(targetUser: string) {
    const { data: myRooms, error: e1 } = await supabase.from("room_members").select("room_id").eq("username", username);
    const { data: theirRooms, error: e2 } = await supabase.from("room_members").select("room_id").eq("username", targetUser);

    if (e1 || e2) console.error("DM lookup failed:", e1?.message || e2?.message);

    if (myRooms && theirRooms) {
      const myRoomIds = new Set(myRooms.map((r) => r.room_id));
      const overlap = theirRooms.find((r) => myRoomIds.has(r.room_id));
      if (overlap) {
        const existing = rooms.find((r) => r.id === overlap.room_id && r.type === "dm");
        if (existing) { setActiveRoom(existing); return; }
      }
    }

    const { data: room, error } = await supabase.from("rooms").insert({ name: `${username}-${targetUser}`, emoji: "💬", type: "dm" }).select().single();
    if (error) { console.error("DM create failed:", error.message); return; }
    if (!room) return;

    const { error: memberErr } = await supabase.from("room_members").insert([
      { room_id: room.id, username },
      { room_id: room.id, username: targetUser },
    ]);
    if (memberErr) console.error("DM members insert failed:", memberErr.message);

    setDmNames((prev) => ({ ...prev, [room.id]: targetUser }));
    setRooms((prev) => [...prev, room]);
    setActiveRoom(room);
  }

  async function handleDeleteRoom(roomId: string) {
    if (!isAdmin) return;
    await supabase.from("rooms").delete().eq("id", roomId);
    if (activeRoom?.id === roomId) setActiveRoom(null);
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
  }

  async function handleLoginStep1(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = (form.get("username") as string).trim();
    if (!name || name.length < 2) return;

    setLoginChecking(true);
    setLoginError("");

    const { data: existing } = await supabase
      .from("users")
      .select("*")
      .eq("username", name)
      .single();

    setLoginUsername(name);
    setLoginIsNew(!existing);
    setLoginStep("password");
    setLoginChecking(false);
  }

  async function handleLoginStep2(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = (form.get("password") as string);
    if (!password || password.length < 4) {
      setLoginError("Password must be at least 4 characters");
      return;
    }

    setLoginChecking(true);
    setLoginError("");

    const hashed = await hashPassword(password);

    if (loginIsNew) {
      const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      const { error: insertErr } = await supabase.from("users").insert({ username: loginUsername, avatar_color: color, password_hash: hashed });

      if (insertErr) {
        console.error("Signup error:", insertErr);
        setLoginError(insertErr.code === "23505" ? "Username just got taken" : insertErr.message);
        setLoginChecking(false);
        return;
      }

      localStorage.setItem("rpb-user", JSON.stringify({ username: loginUsername, avatarColor: color, avatarUrl: null }));
      setUsername(loginUsername);
      setAvatarColor(color);
      setAvatarUrl(null);
      setIsAdmin(false);
    } else {
      const { data: existing } = await supabase
        .from("users")
        .select("*")
        .eq("username", loginUsername)
        .single();

      if (!existing || (existing.password_hash && existing.password_hash !== hashed)) {
        setLoginError("Wrong password");
        setLoginChecking(false);
        return;
      }

      if (!existing.password_hash) {
        await supabase.from("users").update({ password_hash: hashed }).eq("username", loginUsername);
      }

      localStorage.setItem("rpb-user", JSON.stringify({ username: existing.username, avatarColor: existing.avatar_color, avatarUrl: existing.avatar_url }));
      setUsername(existing.username);
      setAvatarColor(existing.avatar_color);
      setAvatarUrl(existing.avatar_url || null);
      setIsAdmin(existing.is_admin || false);
    }

    setLoginChecking(false);
    setLoginStep("username");
  }

  function handleLogout() {
    localStorage.removeItem("rpb-user");
    setUsername("");
    setAvatarColor("");
    setAvatarUrl(null);
    setIsAdmin(false);
    setActiveRoom(null);
    setMessages([]);
    hasSetInitialRoom.current = false;
  }

  async function handleDeleteAccount() {
    await supabase.from("users").delete().eq("username", username);
    handleLogout();
  }

  function handleAvatarChange(url: string) {
    setAvatarUrl(url);
    const stored = JSON.parse(localStorage.getItem("rpb-user") || "{}");
    localStorage.setItem("rpb-user", JSON.stringify({ ...stored, avatarUrl: url }));
  }

  function handleSelectRoom(room: Room) {
    setActiveRoom(room);
  }

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  const activeRoomDisplayName = activeRoom?.type === "dm"
    ? dmNames[activeRoom.id] || activeRoom.name
    : activeRoom?.name;

  const activeRoomDisplayEmoji = activeRoom?.type === "dm" ? "💬" : activeRoom?.emoji;

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <div className="aurora-bg" />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
          <motion.span className="text-4xl" animate={{ rotate: [0, 360] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>⚡</motion.span>
          <span className="text-muted text-sm">Loading...</span>
        </motion.div>
      </div>
    );
  }

  if (!username) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background p-4">
        <div className="aurora-bg" />
        <div className="noise-overlay" />
        <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="glass-strong rounded-2xl p-8 w-full max-w-sm glow-strong gradient-border relative z-10">
          <div className="text-center mb-6">
            <motion.span className="text-4xl inline-block" animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}>⚡</motion.span>
            <h1 className="text-2xl font-bold gradient-text mt-2">Radiant Power Batch</h1>
            <p className="text-muted text-sm mt-1">{loginStep === "username" ? "Pick a username to start chatting" : loginIsNew ? `Create password for "${loginUsername}"` : `Enter password for "${loginUsername}"`}</p>
          </div>
          {loginStep === "username" ? (
            <form onSubmit={handleLoginStep1} className="space-y-4">
              <div>
                <div className="input-glow rounded-xl transition-all">
                  <input name="username" type="text" placeholder="Your username..." maxLength={20} autoFocus required minLength={2} disabled={loginChecking} className="w-full bg-surface/80 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted/40 focus:outline-none transition-all disabled:opacity-50" />
                </div>
                <p className="text-muted/40 text-[11px] mt-1.5">New name = new account, existing = log in</p>
              </div>
              {loginError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-pink text-sm">{loginError}</motion.p>}
              <motion.button type="submit" disabled={loginChecking} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="w-full bg-gradient-to-r from-accent to-pink text-white font-semibold py-3 rounded-xl cursor-pointer btn-shimmer relative overflow-hidden disabled:opacity-50">
                {loginChecking ? "Checking..." : "Continue →"}
              </motion.button>
            </form>
          ) : (
            <form onSubmit={handleLoginStep2} className="space-y-4">
              <div>
                <div className="input-glow rounded-xl transition-all relative">
                  <input name="password" type={showPassword ? "text" : "password"} placeholder={loginIsNew ? "Create a password..." : "Enter your password..."} autoFocus required minLength={4} disabled={loginChecking} className="w-full bg-surface/80 border border-border rounded-xl px-4 py-3 pr-12 text-foreground placeholder:text-muted/40 focus:outline-none transition-all disabled:opacity-50" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors cursor-pointer text-sm">{showPassword ? "🙈" : "👁"}</button>
                </div>
                <p className="text-muted/40 text-[11px] mt-1.5">{loginIsNew ? "Min 4 characters — remember this!" : "Same browser? You stay logged in"}</p>
              </div>
              {loginError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-pink text-sm">{loginError}</motion.p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setLoginStep("username"); setLoginError(""); setShowPassword(false); }} className="px-4 py-3 rounded-xl text-muted hover:text-foreground border border-border hover:bg-surface-hover transition-all cursor-pointer text-sm">Back</button>
                <motion.button type="submit" disabled={loginChecking} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="flex-1 bg-gradient-to-r from-accent to-pink text-white font-semibold py-3 rounded-xl cursor-pointer btn-shimmer relative overflow-hidden disabled:opacity-50">
                  {loginChecking ? "Checking..." : loginIsNew ? "Create Account" : "Log In"}
                </motion.button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-dvh flex bg-background overflow-hidden relative">
      <div className="aurora-bg" />
      <div className="noise-overlay" />

      <Sidebar rooms={rooms} activeRoomId={activeRoom?.id ?? null} onSelectRoom={handleSelectRoom} username={username} avatarColor={avatarColor} avatarUrl={avatarUrl} isAdmin={isAdmin} allUsers={allUsers} onAvatarChange={handleAvatarChange} onLogout={handleLogout} onDeleteAccount={handleDeleteAccount} onDeleteRoom={handleDeleteRoom} onStartDm={handleStartDm} unreadCounts={unreadCounts} dmNames={dmNames} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <div className="glass-strong px-4 py-3.5 flex items-center justify-between shrink-0 relative">
          <div className="absolute bottom-0 left-0 right-0 divider-glow" />
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-muted hover:text-foreground transition-colors cursor-pointer relative">
              <span className="text-xl">☰</span>
              {totalUnread > 0 && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-accent to-pink text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-lg shadow-accent/30">
                  {totalUnread > 9 ? "9+" : totalUnread}
                </motion.span>
              )}
            </button>
            {activeRoom && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2.5">
                <span className="text-xl">{activeRoomDisplayEmoji}</span>
                <div>
                  <h2 className="font-semibold text-foreground text-sm leading-tight">
                    {activeRoom.type === "dm" ? activeRoomDisplayName : `${activeRoomDisplayName}`}
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald rounded-full online-pulse" />
                    <span className="text-[10px] text-muted">
                      {activeRoom.type === "dm" ? "Direct Message" : `${onlineUsers.length} online`}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeRoom && isAdmin && activeRoom.type !== "dm" && (
              <button
                onClick={() => handleDeleteRoom(activeRoom.id)}
                className="text-muted hover:text-pink text-xs transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-pink/10"
                title="Delete room (admin)"
              >
                🗑️
              </button>
            )}
            {activeRoom && (
              <span className="text-[10px] text-muted/30 hidden sm:block">Messages clear every 24h</span>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 relative">
            {activeRoom ? (
              <>
                <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto py-4 messages-fade-top">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-fade-in-up">
                      <motion.span className="text-6xl mb-5 gentle-float inline-block" >{activeRoomDisplayEmoji}</motion.span>
                      <h3 className="text-2xl font-bold gradient-text mb-2">
                        {activeRoom.type === "dm" ? `Chat with ${activeRoomDisplayName}` : `Welcome to #${activeRoomDisplayName}`}
                      </h3>
                      <p className="text-muted/50 text-sm">Be the first to send a message!</p>
                      <div className="mt-4 flex gap-1">
                        {["💬", "🎉", "👋"].map((e, i) => (
                          <motion.span key={e} className="text-lg" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 0.4, y: 0 }} transition={{ delay: 0.5 + i * 0.15 }}>{e}</motion.span>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <MessageComp key={msg.id} message={msg} isOwn={msg.username === username} username={username} isGrouped={isGrouped(i)} isAdmin={isAdmin} />
                  ))}
                </div>

                <TypingIndicator users={typingUsers} />

                <AnimatePresence>
                  {newMsgCount > 0 && (
                    <motion.button
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      onClick={() => { scrollToBottom(); setNewMsgCount(0); }}
                      className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-gradient-to-r from-accent to-pink text-white text-xs font-semibold px-5 py-2.5 rounded-full cursor-pointer z-20 glow-accent btn-shimmer overflow-hidden"
                    >
                      {newMsgCount} new message{newMsgCount !== 1 ? "s" : ""} ↓
                    </motion.button>
                  )}
                </AnimatePresence>

                <div className="p-3 shrink-0 glass-strong relative border-t border-border">
                  <div className="absolute top-0 left-0 right-0 divider-glow" />
                  <div className="relative flex items-center gap-2">
                    <AnimatePresence>{showGifPicker && <GifPicker onSelect={(url) => { sendMediaMessage(url); setShowGifPicker(false); }} onClose={() => setShowGifPicker(false)} />}</AnimatePresence>

                    <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileUpload} className="hidden" />
                    <motion.button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      whileHover={{ scale: 1.15, rotate: 5 }}
                      whileTap={{ scale: 0.85 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      className="text-muted hover:text-accent transition-colors cursor-pointer disabled:opacity-50 text-lg shrink-0 p-2 rounded-xl hover:bg-accent/10"
                      title="Upload image/video"
                    >
                      {uploading ? "⏳" : "📷"}
                    </motion.button>
                    <motion.button
                      onClick={() => setShowGifPicker(!showGifPicker)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={`text-[11px] shrink-0 font-black px-2.5 py-1.5 rounded-xl transition-all cursor-pointer tracking-wide ${showGifPicker ? "bg-accent/20 text-accent ring-1 ring-accent/30" : "text-muted hover:text-accent hover:bg-accent/10"}`}
                      title="GIFs"
                    >
                      GIF
                    </motion.button>

                    <MentionInput value={newMessage} onChange={setNewMessage} onSubmit={sendMessage} onTyping={broadcastTyping} placeholder={activeRoom.type === "dm" ? `Message ${activeRoomDisplayName}...` : `Message #${activeRoomDisplayName}...`} onlineUsers={onlineUsers} allUsers={allUsers} currentUser={username} />
                    <motion.button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      className="bg-gradient-to-r from-accent to-pink hover:shadow-lg hover:shadow-accent/25 disabled:opacity-30 disabled:hover:shadow-none text-white px-3 md:px-5 py-3 rounded-xl transition-all cursor-pointer shrink-0 btn-glow send-pulse"
                    >
                      <span className="text-sm font-semibold hidden sm:inline">Send</span>
                      <span className="text-sm sm:hidden">→</span>
                    </motion.button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center animate-fade-in-up">
                <div className="text-center">
                  <motion.span className="text-7xl block mb-5 gentle-float inline-block">⚡</motion.span>
                  <h2 className="text-3xl font-bold gradient-text mb-3">Welcome!</h2>
                  <p className="text-muted/50 text-sm mb-6">Select a room or create one to start chatting</p>
                  <motion.button
                    onClick={() => setSidebarOpen(true)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="md:hidden text-sm text-accent border border-accent/30 px-5 py-2.5 rounded-xl hover:bg-accent/10 transition-all cursor-pointer"
                  >
                    Open Rooms
                  </motion.button>
                </div>
              </div>
            )}
          </div>

          {activeRoom && activeRoom.type !== "dm" && (
            <div className="hidden lg:block w-56 border-l border-border">
              <OnlineUsers users={onlineUsers} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
