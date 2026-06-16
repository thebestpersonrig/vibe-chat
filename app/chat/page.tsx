"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, uploadImage } from "@/lib/supabase";
import { Room, Message as MessageType, Reaction, UserPresence, AVATAR_COLORS } from "@/lib/types";
import { playMessageSound, playMentionSound } from "@/lib/sounds";
import Sidebar from "@/components/Sidebar";
import MessageComp from "@/components/Message";
import MentionInput from "@/components/MentionInput";
import OnlineUsers from "@/components/OnlineUsers";
import TypingIndicator from "@/components/TypingIndicator";
import GifPicker from "@/components/GifPicker";

export default function ChatPage() {
  const [username, setUsername] = useState("");
  const [avatarColor, setAvatarColor] = useState("");
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

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const hasSetInitialRoom = useRef(false);
  const activeRoomRef = useRef<Room | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  activeRoomRef.current = activeRoom;

  useEffect(() => {
    const stored = localStorage.getItem("rpb-user");
    if (stored) {
      const parsed = JSON.parse(stored);
      setUsername(parsed.username);
      setAvatarColor(parsed.avatarColor);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!username) return;
    loadRooms();

    const roomSub = supabase
      .channel("rooms-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "rooms" }, (payload) => {
        setRooms((prev) => [...prev, payload.new as Room]);
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
    if (data) {
      setRooms(data);
      if (!hasSetInitialRoom.current && data.length > 0) {
        hasSetInitialRoom.current = true;
        setActiveRoom(data[0]);
      }
    }
  }

  useEffect(() => {
    if (!activeRoom || !username) return;
    loadMessages(activeRoom.id);
    setNewMsgCount(0);
    setUnreadCounts((prev) => ({ ...prev, [activeRoom.id]: 0 }));

    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase.channel(`room:${activeRoom.id}`);

    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${activeRoom.id}` }, (payload) => {
        const newMsg = { ...payload.new as MessageType, reactions: [] };
        setMessages((prev) => [...prev, newMsg]);
        if (newMsg.username !== username) {
          if (newMsg.content.toLowerCase().includes(`@${username.toLowerCase()}`)) {
            playMentionSound();
            if (Notification.permission === "granted") {
              new Notification(`${newMsg.username} mentioned you`, { body: newMsg.content, icon: "/favicon.ico" });
            }
          } else {
            playMessageSound();
          }
        }
        if (isNearBottomRef.current) {
          setTimeout(() => scrollToBottom(), 50);
        } else if (newMsg.username !== username) {
          setNewMsgCount((c) => c + 1);
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: `room_id=eq.${activeRoom.id}` }, (payload) => {
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
          await channel.track({ username, avatar_color: avatarColor, online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [activeRoom?.id, username]);

  async function loadMessages(roomId: string) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("*, reactions(*)")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (msgs) {
      setMessages(msgs);
      setTimeout(() => scrollToBottom(), 100);
    }
  }

  function scrollToBottom() {
    messagesContainerRef.current?.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: "smooth" });
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
    await supabase.from("messages").insert({ room_id: activeRoom.id, username, avatar_color: avatarColor, content });
  }

  async function sendMediaMessage(url: string) {
    if (!activeRoom) return;
    await supabase.from("messages").insert({ room_id: activeRoom.id, username, avatar_color: avatarColor, content: url });
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

  function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = (form.get("username") as string).trim();
    if (!name) return;
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    localStorage.setItem("rpb-user", JSON.stringify({ username: name, avatarColor: color }));
    setUsername(name);
    setAvatarColor(color);
  }

  function handleLogout() {
    localStorage.removeItem("rpb-user");
    setUsername("");
    setAvatarColor("");
    setActiveRoom(null);
    setMessages([]);
    hasSetInitialRoom.current = false;
  }

  function handleSelectRoom(room: Room) {
    setActiveRoom(room);
  }

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-background"><div className="text-muted text-sm">Loading...</div></div>;
  }

  if (!username) {
    return (
      <div className="h-screen flex items-center justify-center bg-background p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold gradient-text text-center mb-2">Radiant Power Batch</h1>
          <p className="text-muted text-center text-sm mb-6">Pick a username to start chatting</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input name="username" type="text" placeholder="Your username..." maxLength={20} autoFocus required className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all" />
            <button type="submit" className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-3 rounded-xl transition-colors cursor-pointer">Join Chat</button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <Sidebar rooms={rooms} activeRoomId={activeRoom?.id ?? null} onSelectRoom={handleSelectRoom} username={username} avatarColor={avatarColor} onLogout={handleLogout} unreadCounts={unreadCounts} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="glass border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-muted hover:text-foreground transition-colors cursor-pointer relative">
              <span className="text-xl">☰</span>
              {totalUnread > 0 && <span className="absolute -top-1 -right-1 bg-accent text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{totalUnread > 9 ? "9+" : totalUnread}</span>}
            </button>
            {activeRoom && (
              <div className="flex items-center gap-2">
                <span className="text-lg">{activeRoom.emoji}</span>
                <h2 className="font-semibold text-foreground">{activeRoom.name}</h2>
                <span className="text-xs text-muted">{onlineUsers.length} online</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 relative">
            {activeRoom ? (
              <>
                <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto py-4">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                      <span className="text-4xl mb-3">{activeRoom.emoji}</span>
                      <h3 className="text-lg font-semibold text-foreground mb-1">Welcome to #{activeRoom.name}</h3>
                      <p className="text-muted text-sm">Be the first to send a message!</p>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <MessageComp key={msg.id} message={msg} isOwn={msg.username === username} username={username} isGrouped={isGrouped(i)} />
                  ))}
                  <TypingIndicator users={typingUsers} />
                </div>

                <AnimatePresence>
                  {newMsgCount > 0 && (
                    <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} onClick={() => { scrollToBottom(); setNewMsgCount(0); }} className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-accent hover:bg-accent-hover text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg cursor-pointer z-20 transition-colors">
                      {newMsgCount} new message{newMsgCount !== 1 ? "s" : ""} ↓
                    </motion.button>
                  )}
                </AnimatePresence>

                <div className="border-t border-border p-3 shrink-0">
                  <div className="relative flex items-center gap-2">
                    <AnimatePresence>{showGifPicker && <GifPicker onSelect={(url) => { sendMediaMessage(url); setShowGifPicker(false); }} onClose={() => setShowGifPicker(false)} />}</AnimatePresence>

                    <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileUpload} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="text-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-50 text-lg shrink-0" title="Upload image/video">{uploading ? "⏳" : "📷"}</button>
                    <button onClick={() => setShowGifPicker(!showGifPicker)} className="text-muted hover:text-foreground transition-colors cursor-pointer text-sm shrink-0 font-bold" title="GIFs">GIF</button>

                    <MentionInput value={newMessage} onChange={setNewMessage} onSubmit={sendMessage} onTyping={broadcastTyping} placeholder={`Message #${activeRoom.name}...`} onlineUsers={onlineUsers} currentUser={username} />
                    <button onClick={sendMessage} disabled={!newMessage.trim()} className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-3 rounded-xl transition-colors cursor-pointer shrink-0">
                      <span className="text-sm font-medium">Send</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-5xl block mb-3">💬</span>
                  <h2 className="text-xl font-semibold text-foreground mb-1">Welcome!</h2>
                  <p className="text-muted text-sm">Select a room or create one to start chatting</p>
                </div>
              </div>
            )}
          </div>

          {activeRoom && (
            <div className="hidden lg:block w-56 border-l border-border">
              <OnlineUsers users={onlineUsers} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
