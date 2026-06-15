"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Room, Message as MessageType, Reaction, UserPresence } from "@/lib/types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import Sidebar from "@/components/Sidebar";
import MessageComponent from "@/components/Message";
import TypingIndicator from "@/components/TypingIndicator";
import OnlineUsers from "@/components/OnlineUsers";
import MentionInput from "@/components/MentionInput";
import { motion } from "framer-motion";

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; avatarColor: string } | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showOnline, setShowOnline] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("vibe-chat-user");
    if (!saved) {
      router.push("/");
      return;
    }
    setUser(JSON.parse(saved));

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [router]);

  useEffect(() => {
    loadRooms();

    const roomSub = supabase
      .channel("rooms-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "rooms" }, (payload) => {
        setRooms((prev) => [...prev, payload.new as Room]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomSub);
    };
  }, []);

  useEffect(() => {
    if (!activeRoom || !user) return;

    loadMessages(activeRoom.id);

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

        if (msg.username !== user.username && "Notification" in window && Notification.permission === "granted") {
          const isMentioned = msg.content.toLowerCase().includes(`@${user.username.toLowerCase()}`);
          if (document.hidden || isMentioned) {
            new Notification(
              isMentioned ? `${msg.username} mentioned you` : `${msg.username} in #${activeRoom.name}`,
              {
                body: msg.content,
                icon: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💬</text></svg>`,
                tag: msg.id,
              }
            );
          }
        }
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
      supabase.removeChannel(channel);
    };
  }, [activeRoom, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadRooms() {
    const { data } = await supabase
      .from("rooms")
      .select("*")
      .order("created_at", { ascending: true });
    if (data) {
      setRooms(data);
      if (data.length > 0 && !activeRoom) {
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

      setMessages(
        msgs.map((m) => ({ ...m, reactions: reactionMap.get(m.id) || [] }))
      );
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
    await supabase.from("messages").insert({
      room_id: activeRoom.id,
      username: user.username,
      avatar_color: user.avatarColor,
      content,
    });
  }

  function handleLogout() {
    localStorage.removeItem("vibe-chat-user");
    router.push("/");
  }

  if (!user) return null;

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <Sidebar
        rooms={rooms}
        activeRoomId={activeRoom?.id ?? null}
        onSelectRoom={setActiveRoom}
        username={user.username}
        avatarColor={user.avatarColor}
        onLogout={handleLogout}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeRoom ? (
          <>
            {/* Room header */}
            <div className="h-14 flex items-center justify-between px-5 border-b border-border glass">
              <div className="flex items-center gap-2">
                <span className="text-lg">{activeRoom.emoji}</span>
                <h2 className="font-semibold text-foreground">{activeRoom.name}</h2>
                <span className="text-xs text-muted ml-1">
                  {onlineUsers.length} online
                </span>
              </div>
              <button
                onClick={() => setShowOnline(!showOnline)}
                className={`text-sm px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  showOnline
                    ? "bg-accent/15 text-accent"
                    : "text-muted hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                👥
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 flex min-h-0">
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex-1 overflow-y-auto py-4">
                  {messages.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <motion.div
                          className="text-5xl mb-3"
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          👋
                        </motion.div>
                        <p className="text-muted text-sm">
                          No messages yet — say something!
                        </p>
                      </div>
                    </div>
                  )}
                  {messages.map((msg) => (
                    <MessageComponent
                      key={msg.id}
                      message={msg}
                      isOwn={msg.username === user.username}
                      username={user.username}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <TypingIndicator users={typingUsers} />

                {/* Message input */}
                <form onSubmit={sendMessage} className="p-4 border-t border-border">
                  <div className="flex gap-3">
                    <MentionInput
                      value={newMessage}
                      onChange={setNewMessage}
                      onSubmit={() => {
                        const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                        sendMessage(fakeEvent);
                      }}
                      onTyping={handleTyping}
                      placeholder={`Message #${activeRoom.name}... (type @ to mention)`}
                      onlineUsers={onlineUsers}
                      currentUser={user.username}
                    />
                    <motion.button
                      type="submit"
                      disabled={!newMessage.trim()}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-accent hover:bg-accent-hover disabled:opacity-30 disabled:hover:bg-accent text-white px-5 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                    >
                      Send
                    </motion.button>
                  </div>
                </form>
              </div>

              {/* Online users panel */}
              {showOnline && <OnlineUsers users={onlineUsers} />}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <motion.div
                className="text-6xl mb-4"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                💬
              </motion.div>
              <p className="text-muted">Select a room to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
