"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase, uploadImage } from "@/lib/supabase";
import { Room, Message as MessageType, Reaction, UserPresence } from "@/lib/types";
import { playMessageSound, playMentionSound } from "@/lib/sounds";
import type { RealtimeChannel } from "@supabase/supabase-js";
import Sidebar from "@/components/Sidebar";
import MessageComponent from "@/components/Message";
import TypingIndicator from "@/components/TypingIndicator";
import OnlineUsers from "@/components/OnlineUsers";
import MentionInput from "@/components/MentionInput";
import GifPicker from "@/components/GifPicker";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "rpb-user";

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; avatarColor: string } | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showOnline, setShowOnline] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [newMsgCount, setNewMsgCount] = useState(0);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [uploading, setUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeRoomRef = useRef<string | null>(null);
  const isNearBottomRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasSetInitialRoom = useRef(false);

  useEffect(() => {
    activeRoomRef.current = activeRoom?.id ?? null;
  }, [activeRoom]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      router.push("/");
      return;
    }
    setUser(JSON.parse(saved));

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const mq = window.matchMedia("(min-width: 768px)");
    if (mq.matches) setShowOnline(true);
  }, [router]);

  useEffect(() => {
    loadRooms();

    const roomSub = supabase
      .channel("rooms-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "rooms" }, (payload) => {
        setRooms((prev) => [...prev, payload.new as Room]);
      })
      .subscribe();

    return () => { supabase.removeChannel(roomSub); };
  }, []);

  useEffect(() => {
    if (!user) return;

    const globalSub = supabase
      .channel("global-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as { room_id: string; username: string };
        if (msg.username !== user.username && msg.room_id !== activeRoomRef.current) {
          setUnreadCounts((prev) => ({
            ...prev,
            [msg.room_id]: (prev[msg.room_id] || 0) + 1,
          }));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(globalSub); };
  }, [user]);

  useEffect(() => {
    if (!activeRoom || !user) return;

    loadMessages(activeRoom.id);
    setUnreadCounts((prev) => ({ ...prev, [activeRoom.id]: 0 }));
    setNewMsgCount(0);

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel(`room:${activeRoom.id}`, {
      config: { presence: { key: user.username } },
    });

    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${activeRoom.id}` }, (payload) => {
        const msg = payload.new as MessageType;
        msg.reactions = [];
        setMessages((prev) => [...prev, msg]);

        if (msg.username !== user.username) {
          const isMentioned = msg.content.toLowerCase().includes(`@${user.username.toLowerCase()}`);
          if (isMentioned) playMentionSound(); else playMessageSound();

          if (!isNearBottomRef.current) {
            setNewMsgCount((c) => c + 1);
          }

          if ("Notification" in window && Notification.permission === "granted") {
            if (document.hidden || isMentioned) {
              new Notification(
                isMentioned ? `${msg.username} mentioned you` : `${msg.username} in #${activeRoom.name}`,
                { body: msg.content, tag: msg.id }
              );
            }
          }
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: `room_id=eq.${activeRoom.id}` }, (payload) => {
        const old = payload.old as { id: string };
        setMessages((prev) => prev.filter((m) => m.id !== old.id));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reactions" }, (payload) => {
        const reaction = payload.new as Reaction;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === reaction.message_id
              ? { ...m, reactions: [...(m.reactions || []), reaction] }
              : m
          )
        );
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "reactions" }, (payload) => {
        const old = payload.old as { id: string };
        setMessages((prev) =>
          prev.map((m) => ({
            ...m,
            reactions: (m.reactions || []).filter((r) => r.id !== old.id),
          }))
        );
      })
      .on("broadcast", { event: "typing" }, (payload) => {
        const who = payload.payload?.username as string;
        if (who && who !== user.username) {
          setTypingUsers((prev) => (prev.includes(who) ? prev : [...prev, who]));
          setTimeout(() => {
            setTypingUsers((prev) => prev.filter((u) => u !== who));
          }, 3000);
        }
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ username: string; avatar_color: string }>();
        const users: UserPresence[] = [];
        for (const key of Object.keys(state)) {
          const presences = state[key];
          if (presences.length > 0) {
            users.push({
              username: presences[0].username,
              avatar_color: presences[0].avatar_color,
              online_at: new Date().toISOString(),
            });
          }
        }
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            username: user.username,
            avatar_color: user.avatarColor,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [activeRoom, user]);

  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setNewMsgCount(0);
    }
  }, [messages]);

  function handleScroll() {
    const el = messagesContainerRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    isNearBottomRef.current = near;
    if (near) setNewMsgCount(0);
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    isNearBottomRef.current = true;
    setNewMsgCount(0);
  }

  async function loadRooms() {
    const { data } = await supabase
      .from("rooms")
      .select("*")
      .order("created_at", { ascending: true });
    if (data) {
      setRooms(data);
      if (data.length > 0 && !hasSetInitialRoom.current) {
        hasSetInitialRoom.current = true;
        setActiveRoom(data[0]);
      }
    }
  }

  async function loadMessages(roomId: string) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (msgs) {
      const messageIds = msgs.map((m) => m.id);
      const { data: reactions } = await supabase
        .from("reactions")
        .select("*")
        .in("message_id", messageIds.length > 0 ? messageIds : ["none"]);

      const reactionMap = new Map<string, Reaction[]>();
      for (const r of reactions || []) {
        const list = reactionMap.get(r.message_id) || [];
        list.push(r);
        reactionMap.set(r.message_id, list);
      }

      setMessages(msgs.map((m) => ({ ...m, reactions: reactionMap.get(m.id) || [] })));
    }
  }

  const handleTyping = useCallback(() => {
    if (!channelRef.current || !user) return;
    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { username: user.username },
    });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {}, 3000);
  }, [user]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || !activeRoom || !user) return;

    setNewMessage("");
    scrollToBottom();
    await supabase.from("messages").insert({
      room_id: activeRoom.id,
      username: user.username,
      avatar_color: user.avatarColor,
      content,
    });
  }

  async function sendMediaMessage(url: string) {
    if (!activeRoom || !user) return;
    scrollToBottom();
    await supabase.from("messages").insert({
      room_id: activeRoom.id,
      username: user.username,
      avatar_color: user.avatarColor,
      content: url,
    });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeRoom || !user) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("File must be under 10MB");
      return;
    }

    setUploading(true);
    const url = await uploadImage(file);
    if (url) {
      await sendMediaMessage(url);
    }
    setUploading(false);
    e.target.value = "";
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    router.push("/");
  }

  function isGrouped(index: number): boolean {
    if (index === 0) return false;
    const prev = messages[index - 1];
    const curr = messages[index];
    if (prev.username !== curr.username) return false;
    const gap = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime();
    return gap < 120_000;
  }

  if (!user) return null;

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="h-full flex">
      <Sidebar
        rooms={rooms}
        activeRoomId={activeRoom?.id ?? null}
        onSelectRoom={setActiveRoom}
        username={user.username}
        avatarColor={user.avatarColor}
        onLogout={handleLogout}
        unreadCounts={unreadCounts}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {activeRoom ? (
          <>
            <div className="h-14 flex items-center justify-between px-4 md:px-5 border-b border-border glass">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden text-muted hover:text-foreground cursor-pointer p-1 -ml-1 mr-1 relative"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M3 5h14M3 10h14M3 15h14" />
                  </svg>
                  {totalUnread > 0 && (
                    <span className="absolute -top-1 -right-1 bg-accent text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {totalUnread > 9 ? "9+" : totalUnread}
                    </span>
                  )}
                </button>
                <span className="text-lg">{activeRoom.emoji}</span>
                <h2 className="font-semibold text-foreground truncate">{activeRoom.name}</h2>
                <span className="text-xs text-muted ml-1 hidden sm:inline">{onlineUsers.length} online</span>
              </div>
              <button
                onClick={() => setShowOnline(!showOnline)}
                className={`text-sm px-3 py-1.5 rounded-lg transition-all cursor-pointer hidden md:block ${
                  showOnline ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                👥
              </button>
            </div>

            <div className="flex-1 flex min-h-0">
              <div className="flex-1 flex flex-col min-w-0 relative">
                <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto py-4">
                  {messages.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <motion.div className="text-5xl mb-3" animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                          👋
                        </motion.div>
                        <p className="text-muted text-sm">No messages yet — say something!</p>
                      </div>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <MessageComponent key={msg.id} message={msg} isOwn={msg.username === user.username} username={user.username} isGrouped={isGrouped(i)} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <AnimatePresence>
                  {newMsgCount > 0 && !isNearBottomRef.current && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      onClick={scrollToBottom}
                      className="absolute bottom-24 right-4 bg-accent hover:bg-accent-hover text-white rounded-full p-2.5 shadow-lg cursor-pointer z-10 flex items-center gap-1.5"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M8 3v10M4 9l4 4 4-4" />
                      </svg>
                      <span className="text-xs font-bold">{newMsgCount}</span>
                    </motion.button>
                  )}
                </AnimatePresence>

                <TypingIndicator users={typingUsers} />

                <form onSubmit={sendMessage} className="p-3 md:p-4 border-t border-border">
                  <div className="flex gap-2 md:gap-3 items-end">
                    <div className="flex gap-1 shrink-0">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="text-muted hover:text-foreground p-2.5 hover:bg-surface rounded-xl transition-all cursor-pointer disabled:opacity-40"
                        title="Upload image or video"
                      >
                        {uploading ? (
                          <svg width="20" height="20" viewBox="0 0 20 20" className="animate-spin">
                            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="40" strokeDashoffset="10" />
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="16" height="14" rx="2" />
                            <circle cx="7" cy="8" r="1.5" />
                            <path d="M18 13l-4-4-6 6" />
                          </svg>
                        )}
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowGifPicker(!showGifPicker)}
                          className={`p-2.5 rounded-xl transition-all cursor-pointer text-xs font-bold ${
                            showGifPicker ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground hover:bg-surface"
                          }`}
                          title="Send a GIF"
                        >
                          GIF
                        </button>
                        <AnimatePresence>
                          {showGifPicker && (
                            <GifPicker
                              onSelect={(url) => sendMediaMessage(url)}
                              onClose={() => setShowGifPicker(false)}
                            />
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <MentionInput
                      value={newMessage}
                      onChange={setNewMessage}
                      onSubmit={() => {
                        const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                        sendMessage(fakeEvent);
                      }}
                      onTyping={handleTyping}
                      placeholder={`Message #${activeRoom.name}...`}
                      onlineUsers={onlineUsers}
                      currentUser={user.username}
                    />
                    <motion.button
                      type="submit"
                      disabled={!newMessage.trim()}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-accent hover:bg-accent-hover disabled:opacity-30 disabled:hover:bg-accent text-white px-4 md:px-5 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer shrink-0"
                    >
                      Send
                    </motion.button>
                  </div>
                </form>
              </div>

              {showOnline && <OnlineUsers users={onlineUsers} />}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-4">
              <button onClick={() => setSidebarOpen(true)} className="md:hidden mb-4 text-accent hover:text-accent-hover cursor-pointer text-sm">
                Open rooms →
              </button>
              <motion.div className="text-6xl mb-4" animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                ⚡
              </motion.div>
              <p className="text-muted">Select a room to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
