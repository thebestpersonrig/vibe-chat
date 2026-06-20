"use client";

import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, uploadImage } from "@/lib/supabase";
import { Room, Message as MessageType, Reaction, UserPresence, User, AVATAR_COLORS, Poll, CustomEmoji, Sticker } from "@/lib/types";
import { playMessageSound, playMentionSound } from "@/lib/sounds";
import Sidebar from "@/components/Sidebar";
import MessageComp from "@/components/Message";
import MentionInput from "@/components/MentionInput";
import OnlineUsers from "@/components/OnlineUsers";
import TypingIndicator from "@/components/TypingIndicator";
import GifPicker from "@/components/GifPicker";
import EmojiPicker from "@/components/EmojiPicker";
import AdminPanel from "@/components/AdminPanel";
import ImageLightbox from "@/components/ImageLightbox";
import UserProfileCard from "@/components/UserProfileCard";
import PollCreator from "@/components/PollCreator";
import VoiceRecorder from "@/components/VoiceRecorder";
import StickerPicker from "@/components/StickerPicker";
import { getBrowserFingerprint } from "@/lib/fingerprint";

const MAX_UPLOAD_MB = 10;
const SPAM_WINDOW_MS = 4000;
const SPAM_THRESHOLD = 5;
const SPAM_COOLDOWN_MS = 3000;

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [replyingTo, setReplyingTo] = useState<MessageType | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [spamCooldown, setSpamCooldown] = useState(false);
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedMsgs, setSelectedMsgs] = useState<Set<string>>(new Set());
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [customEmojis, setCustomEmojis] = useState<CustomEmoji[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [mutedRooms, setMutedRooms] = useState<string[]>([]);
  const [unreadDividerMsgId, setUnreadDividerMsgId] = useState<string | null>(null);
  const [, forceUpdate] = useState(0);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const hasSetInitialRoom = useRef(false);
  const activeRoomRef = useRef<Room | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const spamTimestamps = useRef<number[]>([]);
  const soundEnabledRef = useRef(soundEnabled);
  const kickChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const messagesRef = useRef<MessageType[]>([]);
  const mutedRoomsRef = useRef<string[]>([]);

  activeRoomRef.current = activeRoom;
  soundEnabledRef.current = soundEnabled;
  messagesRef.current = messages;
  mutedRoomsRef.current = mutedRooms;

  // Tab title + favicon badge with unread count
  useEffect(() => {
    const total = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
    document.title = total > 0 ? `(${total}) Radiant Power Batch` : "Radiant Power Batch";

    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.font = "bold 52px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("💬", 32, 32);
      if (total > 0) {
        ctx.beginPath();
        ctx.arc(50, 14, 14, 0, 2 * Math.PI);
        ctx.fillStyle = "#EC4899";
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(total > 9 ? "9+" : String(total), 50, 15);
      }
      const link = document.querySelector<HTMLLinkElement>("link[rel='icon']") || document.createElement("link");
      link.rel = "icon";
      link.href = canvas.toDataURL();
      if (!link.parentElement) document.head.appendChild(link);
    }
  }, [unreadCounts]);

  // Sound + mute preferences from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("rpb-sound");
    if (stored !== null) setSoundEnabled(stored === "true");
    const mutedStored = localStorage.getItem("rpb-muted-rooms");
    if (mutedStored) {
      try { setMutedRooms(JSON.parse(mutedStored)); } catch {}
    }
  }, []);

  // Show notification permission banner if not yet decided
  useEffect(() => {
    if (username && "Notification" in window && Notification.permission === "default") {
      setShowNotifBanner(true);
    }
  }, [username]);

  // Last seen heartbeat
  useEffect(() => {
    if (!username) return;
    const update = () => supabase.from("users").update({ last_seen_at: new Date().toISOString() }).eq("username", username).then(() => {});
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [username]);

  useEffect(() => {
    const me = allUsers.find((u) => u.username === username);
    if (!me?.muted_until || new Date(me.muted_until).getTime() <= Date.now()) return;
    const interval = setInterval(() => forceUpdate((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [allUsers, username]);

  useEffect(() => {
    if (!unreadDividerMsgId) return;
    const timer = setTimeout(() => setUnreadDividerMsgId(null), 5000);
    return () => clearTimeout(timer);
  }, [unreadDividerMsgId]);

  useEffect(() => {
    async function init() {
      const stored = localStorage.getItem("rpb-user");
      if (stored) {
        let parsed: { username?: string; avatarColor?: string; avatarUrl?: string | null };
        try { parsed = JSON.parse(stored); } catch { localStorage.removeItem("rpb-user"); setLoading(false); return; }
        if (!parsed.username) { localStorage.removeItem("rpb-user"); setLoading(false); return; }
        const { data, error } = await supabase.from("users").select("username, avatar_color, avatar_url, is_admin, is_banned").eq("username", parsed.username).single();
        if (error && error.code !== "PGRST116") {
          // Query failed (network, timeout, etc.) — keep session alive from localStorage
          setUsername(parsed.username!);
          setAvatarColor(parsed.avatarColor || "");
          setAvatarUrl(parsed.avatarUrl || null);
          setLoading(false);
          return;
        }
        if (!data || data.is_banned) {
          localStorage.removeItem("rpb-user");
          setLoading(false);
          return;
        }
        setUsername(parsed.username);
        setAvatarColor(parsed.avatarColor ?? data.avatar_color);
        setAvatarUrl(parsed.avatarUrl ?? data.avatar_url ?? null);
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
    loadCustomEmojis();
    loadStickers();

    const roomSub = supabase
      .channel("rooms-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "rooms" }, async (payload) => {
        const room = payload.new as Room;
        if (room.type === "dm") {
          const { data: members } = await supabase.from("room_members").select("username").eq("room_id", room.id);
          if (!members?.some((m) => m.username === username)) return;
          const others = members.filter((m) => m.username !== username);
          if (others.length === 1) setDmNames((prev) => ({ ...prev, [room.id]: others[0].username }));
          else if (others.length > 1) setDmNames((prev) => ({ ...prev, [room.id]: others.map((o) => o.username).join(", ") }));
        }
        setRooms((prev) => prev.some((r) => r.id === room.id) ? prev : [...prev, room]);
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
          setRooms((prev) => {
            if (prev.some((r) => r.id === msg.room_id)) {
              setUnreadCounts((uc) => ({ ...uc, [msg.room_id]: (uc[msg.room_id] || 0) + 1 }));
            }
            return prev;
          });
        }
      })
      .subscribe();

    const usersSub = supabase
      .channel("users-changes")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "users" }, (payload) => {
        const updated = payload.new as User;
        setAllUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u));
      })
      .subscribe();

    const kickChannel = supabase
      .channel("admin-kick")
      .on("broadcast", { event: "kick" }, ({ payload: p }) => {
        if (p.target === username) {
          localStorage.removeItem("rpb-user");
          setUsername("");
          setActiveRoom(null);
          setMessages([]);
          alert("Your account has been deleted by an admin.");
        }
      })
      .on("broadcast", { event: "rename" }, ({ payload: p }) => {
        if (p.oldUsername === username) {
          setUsername(p.newUsername);
          const stored = JSON.parse(localStorage.getItem("rpb-user") || "{}");
          localStorage.setItem("rpb-user", JSON.stringify({ ...stored, username: p.newUsername }));
        }
        setMessages(prev => prev.map(m => m.username === p.oldUsername ? { ...m, username: p.newUsername } : m));
      })
      .subscribe();
    kickChannelRef.current = kickChannel;

    const usersInterval = setInterval(loadAllUsers, 15000);

    return () => {
      supabase.removeChannel(roomSub);
      supabase.removeChannel(globalMsgSub);
      supabase.removeChannel(usersSub);
      supabase.removeChannel(kickChannel);
      clearInterval(usersInterval);
    };
  }, [username]);

  async function loadRooms() {
    const { data } = await supabase.from("rooms").select("*").order("created_at");
    if (!data) return;

    const { data: myMemberships } = await supabase
      .from("room_members")
      .select("room_id")
      .eq("username", username);
    const myDmRoomIds = new Set((myMemberships || []).map((m) => m.room_id));

    const visible = data.filter((r) => r.type !== "dm" || myDmRoomIds.has(r.id));

    const dmRoomIds = visible.filter((r) => r.type === "dm").map((r) => r.id);
    const names: Record<string, string> = {};
    if (dmRoomIds.length > 0) {
      const { data: dmMembers } = await supabase
        .from("room_members")
        .select("room_id, username")
        .in("room_id", dmRoomIds);
      for (const room of visible) {
        if (room.type === "dm") {
          const others = (dmMembers || []).filter((m) => m.room_id === room.id && m.username !== username);
          names[room.id] = others.length === 1 ? others[0].username : others.map((o) => o.username).join(", ");
        }
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
    const { data, error } = await supabase
      .from("users")
      .select("id, username, avatar_color, avatar_url, is_admin, is_banned, title, bio, banner_url, muted_until, status_emoji, status_text, last_seen_at, created_at")
      .order("username");
    if (data) {
      setAllUsers(data);
    } else if (error?.message?.includes("last_seen_at")) {
      const { data: fallback } = await supabase
        .from("users")
        .select("id, username, avatar_color, avatar_url, is_admin, is_banned, title, muted_until, status_emoji, status_text, created_at")
        .order("username");
      if (fallback) setAllUsers(fallback);
    }
  }

  useEffect(() => {
    if (!activeRoom || !username) return;
    setMessages([]);
    setTypingUsers([]);
    setReplyingTo(null);
    setSelectMode(false);
    setSelectedMsgs(new Set());
    setShowPollCreator(false);
    setShowVoiceRecorder(false);
    const lastRead = localStorage.getItem(`rpb-lastread-${activeRoom.id}`);
    setUnreadDividerMsgId(lastRead);
    loadMessages(activeRoom.id);
    loadPolls(activeRoom.id);
    setNewMsgCount(0);
    setUnreadCounts((prev) => ({ ...prev, [activeRoom.id]: 0 }));

    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase.channel(`room:${activeRoom.id}`);

    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${activeRoom.id}` }, (payload) => {
        const newMsg = { ...payload.new as MessageType, reactions: [] };
        if (newMsg.username === username) return;
        setMessages((prev) => [...prev, newMsg]);
        const isRoomMuted = mutedRoomsRef.current.includes(activeRoomRef.current?.id || "");
        const mentionRe = new RegExp(`@${username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?!\\w)`, "i");
        const isMention = mentionRe.test(newMsg.content) || /@all(?!\w)/i.test(newMsg.content);
        const isReplyToMe = newMsg.reply_to && messagesRef.current.find(m => m.id === newMsg.reply_to)?.username === username;
        if (isMention || isReplyToMe) {
          if (soundEnabledRef.current && !isRoomMuted) playMentionSound();
          if (Notification.permission === "granted" && !isRoomMuted) {
            const title = isReplyToMe && !isMention
              ? `${newMsg.username} replied to you`
              : `${newMsg.username} mentioned you`;
            new Notification(title, { body: newMsg.content, icon: "/favicon.ico" });
          }
        } else {
          if (soundEnabledRef.current && !isRoomMuted) playMessageSound();
        }
        if (isNearBottomRef.current) {
          setTimeout(() => scrollToBottom(), 50);
        } else {
          setNewMsgCount((c) => c + 1);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `room_id=eq.${activeRoom.id}` }, (payload) => {
        const updated = payload.new as MessageType;
        setMessages((prev) => prev.map((m) => m.id === updated.id ? { ...m, ...updated, reactions: m.reactions } : m));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (payload) => {
        setMessages((prev) => prev.filter((m) => m.id !== (payload.old as { id: string }).id));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes" }, () => {
        if (activeRoomRef.current) loadPolls(activeRoomRef.current.id);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "polls", filter: `room_id=eq.${activeRoom.id}` }, () => {
        if (activeRoomRef.current) loadPolls(activeRoomRef.current.id);
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

  useEffect(() => {
    if (!channelRef.current || !username) return;
    channelRef.current.track({ username, avatar_color: avatarColor, avatar_url: avatarUrl, online_at: new Date().toISOString() });
  }, [avatarColor, avatarUrl]);

  async function loadMessages(roomId: string) {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: msgs } = await supabase
      .from("messages")
      .select("*, reactions(*)")
      .eq("room_id", roomId)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(200);
    if (msgs) {
      setMessages(msgs.reverse());
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
    if (nearBottom) {
      setNewMsgCount(0);
      setUnreadDividerMsgId(null);
      const room = activeRoomRef.current;
      const msgs = messagesRef.current;
      if (room && msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        if (!lastMsg.id.startsWith("temp-")) {
          localStorage.setItem(`rpb-lastread-${room.id}`, lastMsg.id);
        }
      }
    }
  }

  function isMuted(): boolean {
    const me = allUsers.find((u) => u.username === username);
    if (!me?.muted_until) return false;
    return new Date(me.muted_until).getTime() > Date.now();
  }

  function getMuteRemaining(): string {
    const me = allUsers.find((u) => u.username === username);
    if (!me?.muted_until) return "";
    const diff = new Date(me.muted_until).getTime() - Date.now();
    if (diff <= 0) return "";
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }

  function checkSpam(): boolean {
    const now = Date.now();
    spamTimestamps.current = spamTimestamps.current.filter((t) => now - t < SPAM_WINDOW_MS);
    spamTimestamps.current.push(now);
    if (spamTimestamps.current.length >= SPAM_THRESHOLD) {
      setSpamCooldown(true);
      spamTimestamps.current = [];
      setTimeout(() => setSpamCooldown(false), SPAM_COOLDOWN_MS);
      return true;
    }
    return false;
  }

  async function sendMessage() {
    let content = newMessage.trim();
    if (!content || !activeRoom || isMuted() || spamCooldown) return;

    if (content.startsWith("/")) {
      if (content.startsWith("/shrug")) {
        const text = content.slice(6).trim();
        content = text ? `${text} ¯\\_(ツ)_/¯` : "¯\\_(ツ)_/¯";
      } else if (content.startsWith("/tableflip")) {
        const text = content.slice(10).trim();
        content = text ? `${text} (╯°□°)╯︵ ┻━┻` : "(╯°□°)╯︵ ┻━┻";
      } else if (content.startsWith("/unflip")) {
        const text = content.slice(7).trim();
        content = text ? `${text} ┬─┬ノ( º _ ºノ)` : "┬─┬ノ( º _ ºノ)";
      } else if (content.startsWith("/me ")) {
        content = `_${content.slice(4).trim()}_`;
      } else if (content === "/gif" || content === "/giphy") {
        setShowGifPicker(true);
        setNewMessage("");
        return;
      } else if (content === "/poll") {
        setShowPollCreator(true);
        setNewMessage("");
        return;
      }
    }

    if (checkSpam()) return;
    setNewMessage("");
    const replyId = replyingTo?.id || null;
    setReplyingTo(null);

    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: tempId,
      room_id: activeRoom.id,
      username,
      avatar_color: avatarColor,
      avatar_url: avatarUrl,
      content,
      reply_to: replyId,
      created_at: new Date().toISOString(),
      reactions: [],
    }]);
    if (isNearBottomRef.current) setTimeout(() => scrollToBottom(), 20);

    const insertPayload: Record<string, unknown> = { room_id: activeRoom.id, username, avatar_color: avatarColor, avatar_url: avatarUrl, content };
    if (replyId) insertPayload.reply_to = replyId;

    const { data, error } = await supabase
      .from("messages")
      .insert(insertPayload)
      .select()
      .single();

    if (data) {
      setMessages((prev) => prev.map((m) => m.id === tempId ? { ...data, reactions: [] } : m));
    } else if (error) {
      console.error("Send failed:", error.message);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  }

  async function sendMediaMessage(url: string) {
    if (!activeRoom || isMuted() || spamCooldown) return;

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
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      alert(`File too large — max ${MAX_UPLOAD_MB}MB`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setUploading(true);
    const url = await uploadImage(file);
    if (url) await sendMediaMessage(url);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function loadPolls(roomId: string) {
    const { data } = await supabase.from("polls").select("*, poll_votes(*)").eq("room_id", roomId);
    if (data) setPolls(data.map((p: Record<string, unknown>) => ({ ...p, votes: p.poll_votes }) as unknown as Poll));
  }

  async function loadCustomEmojis() {
    const { data } = await supabase.from("custom_emojis").select("*").order("created_at");
    if (data) setCustomEmojis(data);
  }

  async function loadStickers() {
    const { data } = await supabase.from("stickers").select("*").order("created_at");
    if (data) setStickers(data);
  }

  async function handleCreatePoll(question: string, options: string[]) {
    if (!activeRoom) return;
    const { data: poll, error } = await supabase.from("polls").insert({ room_id: activeRoom.id, username, question, options }).select().single();
    if (error || !poll) { console.error("Poll create failed:", error?.message); return; }
    await supabase.from("messages").insert({ room_id: activeRoom.id, username, avatar_color: avatarColor, avatar_url: avatarUrl, content: `[poll:${poll.id}]` });
    setShowPollCreator(false);
    setNewMessage("");
  }

  async function handleVoiceMessage(blob: Blob) {
    setUploading(true);
    const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
    const url = await uploadImage(file, "voice-");
    if (url) await sendMediaMessage(url);
    setUploading(false);
    setShowVoiceRecorder(false);
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        if (file.size > MAX_UPLOAD_MB * 1024 * 1024) { alert(`Image too large — max ${MAX_UPLOAD_MB}MB`); return; }
        setUploading(true);
        uploadImage(file).then(url => {
          if (url) sendMediaMessage(url);
          setUploading(false);
        });
        return;
      }
    }
  }

  async function handleSetStatus(emoji: string, text: string) {
    await supabase.from("users").update({ status_emoji: emoji || null, status_text: text || null }).eq("username", username);
    loadAllUsers();
  }

  async function handleBioChange(bio: string) {
    await supabase.from("users").update({ bio: bio || null }).eq("username", username);
    loadAllUsers();
  }

  async function handleBannerChange(bannerUrl: string | null) {
    await supabase.from("users").update({ banner_url: bannerUrl }).eq("username", username);
    loadAllUsers();
  }

  async function handleSetRoomDescription(description: string) {
    if (!activeRoom) return;
    await supabase.from("rooms").update({ description: description || null }).eq("id", activeRoom.id);
    setRooms(prev => prev.map(r => r.id === activeRoom.id ? { ...r, description } : r));
    setActiveRoom(prev => prev ? { ...prev, description } : prev);
  }

  async function handleEditMessage(id: string, newContent: string) {
    const { error } = await supabase.from("messages").update({ content: newContent, edited_at: new Date().toISOString() }).eq("id", id);
    if (error) { console.error("Edit failed:", error.message); return; }
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, content: newContent, edited_at: new Date().toISOString() } : m));
  }

  async function handlePurgeMessages(target: string) {
    if (!activeRoom) return;
    await supabase.from("messages").delete().eq("username", target).eq("room_id", activeRoom.id);
    setMessages(prev => prev.filter(m => m.username !== target));
  }

  async function handleFingerprintBan(target: string) {
    const { data: user } = await supabase.from("users").select("fingerprint").eq("username", target).single();
    if (user?.fingerprint) {
      await supabase.from("banned_fingerprints").insert({ fingerprint: user.fingerprint, banned_username: target });
    }
    await supabase.from("users").update({ is_banned: true }).eq("username", target);
    kickChannelRef.current?.send({ type: "broadcast", event: "kick", payload: { target } });
    loadAllUsers();
  }

  async function handleFingerprintUnban(target: string) {
    const { data: user } = await supabase.from("users").select("fingerprint").eq("username", target).single();
    if (user?.fingerprint) {
      await supabase.from("banned_fingerprints").delete().eq("fingerprint", user.fingerprint);
    }
    await supabase.from("users").update({ is_banned: false }).eq("username", target);
    loadAllUsers();
  }

  async function handleBulkDelete() {
    if (selectedMsgs.size === 0) return;
    const ids = Array.from(selectedMsgs);
    await supabase.from("messages").delete().in("id", ids);
    setMessages(prev => prev.filter(m => !selectedMsgs.has(m.id)));
    setSelectedMsgs(new Set());
    setSelectMode(false);
  }

  function handleOpenProfile(uname: string) {
    const user = allUsers.find((u) => u.username === uname);
    if (user) setProfileUser(user);
  }

  function handleToggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("rpb-sound", String(next));
  }

  function handleToggleMuteRoom(roomId: string) {
    setMutedRooms(prev => {
      const next = prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId];
      localStorage.setItem("rpb-muted-rooms", JSON.stringify(next));
      return next;
    });
  }

  async function handlePasswordChange(currentPw: string, newPw: string): Promise<boolean> {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change-password", username, currentPassword: currentPw, newPassword: newPw }),
    });
    return res.ok;
  }

  function broadcastTyping() {
    if (typingTimeoutRef.current) return;
    channelRef.current?.send({ type: "broadcast", event: "typing", payload: { username } });
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 2000);
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
      const overlaps = theirRooms.filter((r) => myRoomIds.has(r.room_id));
      const existingDm = overlaps.map((o) => rooms.find((r) => r.id === o.room_id && r.type === "dm")).find(Boolean);
      if (existingDm) { setActiveRoom(existingDm); return; }
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

  async function handleStartGroupDm(users: string[]) {
    const allMembers = [username, ...users].sort();

    const { data: myMemberships } = await supabase.from("room_members").select("room_id").eq("username", username);
    if (myMemberships) {
      for (const m of myMemberships) {
        const existing = rooms.find((r) => r.id === m.room_id && r.type === "dm");
        if (!existing) continue;
        const { data: members } = await supabase.from("room_members").select("username").eq("room_id", existing.id);
        if (!members) continue;
        const sorted = members.map((x) => x.username).sort();
        if (sorted.length === allMembers.length && sorted.every((n, i) => n === allMembers[i])) {
          setActiveRoom(existing);
          return;
        }
      }
    }

    const { data: room, error } = await supabase.from("rooms").insert({ name: allMembers.join("-"), emoji: "💬", type: "dm" }).select().single();
    if (error || !room) { console.error("Group DM create failed:", error?.message); return; }

    const { error: memberErr } = await supabase.from("room_members").insert(allMembers.map((u) => ({ room_id: room.id, username: u })));
    if (memberErr) console.error("Group DM members insert failed:", memberErr.message);

    setDmNames((prev) => ({ ...prev, [room.id]: users.join(", ") }));
    setRooms((prev) => [...prev, room]);
    setActiveRoom(room);
  }

  async function handleDeleteRoom(roomId: string) {
    if (!isAdmin) return;
    await supabase.from("rooms").delete().eq("id", roomId);
    if (activeRoom?.id === roomId) setActiveRoom(null);
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
  }

  async function handleAdminDeleteUser(target: string) {
    await supabase.from("users").delete().eq("username", target);
    kickChannelRef.current?.send({ type: "broadcast", event: "kick", payload: { target } });
    loadAllUsers();
  }

  async function handleAdminRenameUser(oldUsername: string, newUsername: string): Promise<boolean> {
    const { data: existing } = await supabase.from("users").select("username").eq("username", newUsername).maybeSingle();
    if (existing) return false;
    const { error } = await supabase.from("users").update({ username: newUsername }).eq("username", oldUsername);
    if (error) { console.error("Rename failed:", error.message); return false; }
    await Promise.all([
      supabase.from("messages").update({ username: newUsername }).eq("username", oldUsername),
      supabase.from("reactions").update({ username: newUsername }).eq("username", oldUsername),
      supabase.from("room_members").update({ username: newUsername }).eq("username", oldUsername),
      supabase.from("polls").update({ username: newUsername }).eq("username", oldUsername),
      supabase.from("poll_votes").update({ username: newUsername }).eq("username", oldUsername),
      supabase.from("custom_emojis").update({ uploaded_by: newUsername }).eq("uploaded_by", oldUsername),
      supabase.from("stickers").update({ uploaded_by: newUsername }).eq("uploaded_by", oldUsername),
    ]);
    kickChannelRef.current?.send({ type: "broadcast", event: "rename", payload: { oldUsername, newUsername } });
    setMessages(prev => prev.map(m => m.username === oldUsername ? { ...m, username: newUsername } : m));
    loadAllUsers();
    return true;
  }

  async function handleAdminBanUser(target: string) {
    await supabase.from("users").update({ is_banned: true }).eq("username", target);
    kickChannelRef.current?.send({ type: "broadcast", event: "kick", payload: { target } });
    loadAllUsers();
  }

  async function handleAdminUnbanUser(target: string) {
    await supabase.from("users").update({ is_banned: false }).eq("username", target);
    loadAllUsers();
  }

  function scrollToMessage(msgId: string) {
    const el = document.getElementById(`msg-${msgId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("highlight-flash");
    setTimeout(() => el.classList.remove("highlight-flash"), 1500);
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
      .select("username")
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

    let fingerprint = "";
    try { fingerprint = await getBrowserFingerprint(); } catch {}

    if (loginIsNew) {
      const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "signup", username: loginUsername, password, avatarColor: color, fingerprint }),
      });
      const data = await res.json();

      if (!res.ok) {
        setLoginError(res.status === 409 ? "Username just got taken" : data.error || "Signup failed");
        setLoginChecking(false);
        return;
      }

      localStorage.setItem("rpb-user", JSON.stringify({ username: loginUsername, avatarColor: color, avatarUrl: null }));
      setUsername(loginUsername);
      setAvatarColor(color);
      setAvatarUrl(null);
      setIsAdmin(false);
    } else {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", username: loginUsername, password, fingerprint }),
      });
      const data = await res.json();

      if (!res.ok) {
        setLoginError(res.status === 403 ? "This account has been banned" : "Wrong password");
        setLoginChecking(false);
        return;
      }

      localStorage.setItem("rpb-user", JSON.stringify({ username: data.user.username, avatarColor: data.user.avatarColor, avatarUrl: data.user.avatarUrl }));
      setUsername(data.user.username);
      setAvatarColor(data.user.avatarColor);
      setAvatarUrl(data.user.avatarUrl || null);
      setIsAdmin(data.user.isAdmin || false);
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

  const replyLookup = useCallback((id: string | null | undefined) => {
    if (!id) return null;
    return messages.find((m) => m.id === id) || null;
  }, [messages]);

  const pollLookup = useCallback((content: string) => {
    const match = content.match(/^\[poll:([a-f0-9-]+)\]$/);
    if (!match) return null;
    return polls.find(p => p.id === match[1]) || null;
  }, [polls]);

  const nonBannedUsers = useMemo(() => allUsers.filter(u => !u.is_banned), [allUsers]);

  const allUsernames = useMemo(() => nonBannedUsers.map(u => u.username), [nonBannedUsers]);

  const mentionableUsers = useMemo(() => {
    if (!activeRoom || activeRoom.type !== "dm") return nonBannedUsers;
    const names = dmNames[activeRoom.id];
    if (!names) return nonBannedUsers;
    const memberNames = new Set(names.split(", ").concat([username]));
    return nonBannedUsers.filter(u => memberNames.has(u.username));
  }, [activeRoom, nonBannedUsers, dmNames, username]);

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <div className="aurora-bg" />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
          <motion.span
            className="text-5xl"
            animate={{
              rotate: [0, 360],
              scale: [1, 1.2, 1],
              filter: ["drop-shadow(0 0 0px rgba(139,92,246,0))", "drop-shadow(0 0 20px rgba(139,92,246,0.5))", "drop-shadow(0 0 0px rgba(139,92,246,0))"],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            ⚡
          </motion.span>
          <motion.span
            className="text-muted text-sm"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            Loading...
          </motion.span>
        </motion.div>
      </div>
    );
  }

  if (!username) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background p-4">
        <div className="aurora-bg" />
        <div className="noise-overlay" />
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.85, rotateX: 10 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, mass: 0.8 }}
          className="glass-strong rounded-2xl p-8 w-full max-w-sm glow-strong gradient-border relative z-10"
          style={{ perspective: "1200px" }}
        >
          <div className="text-center mb-6">
            <motion.span
              className="text-5xl inline-block"
              animate={{
                y: [0, -12, 0],
                rotate: [0, 5, -5, 0],
                filter: ["drop-shadow(0 0 0px rgba(139,92,246,0))", "drop-shadow(0 0 25px rgba(139,92,246,0.5))", "drop-shadow(0 0 0px rgba(139,92,246,0))"],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              ⚡
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
              className="text-2xl font-bold gradient-text text-glow mt-2"
            >
              Radiant Power Batch
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-muted text-sm mt-1"
            >
              {loginStep === "username" ? "Pick a username to start chatting" : loginIsNew ? `Create password for "${loginUsername}"` : `Enter password for "${loginUsername}"`}
            </motion.p>
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

      <Sidebar rooms={rooms} activeRoomId={activeRoom?.id ?? null} onSelectRoom={handleSelectRoom} username={username} avatarColor={avatarColor} avatarUrl={avatarUrl} isAdmin={isAdmin} allUsers={allUsers} onAvatarChange={handleAvatarChange} onLogout={handleLogout} onDeleteAccount={handleDeleteAccount} onDeleteRoom={handleDeleteRoom} onStartDm={handleStartDm} onStartGroupDm={handleStartGroupDm} onOpenAdminPanel={() => setShowAdminPanel(true)} unreadCounts={unreadCounts} dmNames={dmNames} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} soundEnabled={soundEnabled} onToggleSound={handleToggleSound} onPasswordChange={handlePasswordChange} onSetStatus={handleSetStatus} mutedRooms={mutedRooms} onToggleMuteRoom={handleToggleMuteRoom} onBioChange={handleBioChange} onBannerChange={handleBannerChange} />

      <AnimatePresence>
        {showAdminPanel && (
          <AdminPanel allUsers={allUsers} onClose={() => setShowAdminPanel(false)} onUpdate={loadAllUsers} onDeleteUser={handleAdminDeleteUser} onRenameUser={handleAdminRenameUser} onBanUser={handleAdminBanUser} onUnbanUser={handleAdminUnbanUser} onPurgeMessages={handlePurgeMessages} onFingerprintBan={handleFingerprintBan} onFingerprintUnban={handleFingerprintUnban} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {profileUser && (
          <UserProfileCard user={profileUser} onClose={() => setProfileUser(null)} onStartDm={(u) => { handleStartDm(u); setProfileUser(null); }} currentUser={username} isOnline={onlineUsers.some(u => u.username === profileUser.username)} />
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="glass-strong px-4 py-3.5 flex items-center justify-between shrink-0 relative"
        >
          <div className="absolute bottom-0 left-0 right-0 glow-line" />
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
                    {activeRoom.description && activeRoom.type !== "dm" && (
                      <span className="text-[10px] text-muted/40 truncate max-w-[200px]">· {activeRoom.description}</span>
                    )}
                    {isAdmin && activeRoom.type !== "dm" && (
                      <button onClick={() => { const desc = prompt("Room description:", activeRoom.description || ""); if (desc !== null) handleSetRoomDescription(desc); }} className="text-muted/30 hover:text-muted text-[10px] cursor-pointer p-0.5 rounded hover:bg-surface-hover transition-colors" title="Edit description">✏️</button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeRoom && isAdmin && (
              selectMode ? (
                <button
                  onClick={() => { setSelectMode(false); setSelectedMsgs(new Set()); }}
                  className="text-[10px] flex items-center gap-1 px-2 py-1 rounded-lg transition-all cursor-pointer bg-pink/15 text-pink"
                >
                  Cancel
                </button>
              ) : (
                <button
                  onClick={() => setSelectMode(true)}
                  className="text-[10px] flex items-center gap-1 px-2 py-1 rounded-lg transition-all cursor-pointer text-muted/40 hover:text-muted hover:bg-surface-hover"
                >
                  Select
                </button>
              )
            )}
            {activeRoom && (
              <span className="text-[10px] text-muted/30 hidden sm:block">Messages clear every 24h</span>
            )}
          </div>
        </motion.div>

        {/* Notification permission banner */}
        <AnimatePresence>
          {showNotifBanner && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-b border-accent/20 bg-accent/5"
            >
              <div className="px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm">🔔</span>
                  <span className="text-xs text-foreground/70">Enable notifications to get pinged when someone mentions you</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={async () => {
                      const result = await Notification.requestPermission();
                      if (result !== "default") setShowNotifBanner(false);
                    }}
                    className="text-[10px] bg-accent/20 hover:bg-accent/30 text-accent px-3 py-1.5 rounded-lg cursor-pointer transition-colors font-medium"
                  >
                    Enable
                  </button>
                  <button onClick={() => setShowNotifBanner(false)} className="text-muted/40 hover:text-muted text-xs cursor-pointer">✕</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 relative">
            {activeRoom ? (
              <>
                <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto py-4 messages-fade-top">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                      <motion.span
                        className="text-7xl mb-5 inline-block"
                        initial={{ scale: 0, rotate: -30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                      >
                        <motion.span
                          className="inline-block"
                          animate={{
                            y: [0, -15, 0],
                            rotate: [0, 8, -8, 0],
                            filter: ["drop-shadow(0 0 0px rgba(139,92,246,0))", "drop-shadow(0 0 30px rgba(139,92,246,0.4))", "drop-shadow(0 0 0px rgba(139,92,246,0))"],
                          }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        >
                          {activeRoomDisplayEmoji}
                        </motion.span>
                      </motion.span>
                      <motion.h3
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25, type: "spring", stiffness: 300 }}
                        className="text-2xl font-bold gradient-text text-glow mb-2"
                      >
                        {activeRoom.type === "dm" ? `Chat with ${activeRoomDisplayName}` : `Welcome to #${activeRoomDisplayName}`}
                      </motion.h3>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-muted/50 text-sm"
                      >
                        Be the first to send a message!
                      </motion.p>
                      <div className="mt-4 flex gap-2">
                        {["💬", "🎉", "👋"].map((e, i) => (
                          <motion.span
                            key={e}
                            className="text-xl"
                            initial={{ opacity: 0, scale: 0, y: 20 }}
                            animate={{ opacity: 0.5, scale: 1, y: 0 }}
                            transition={{ delay: 0.6 + i * 0.12, type: "spring", stiffness: 400, damping: 15 }}
                            whileHover={{ scale: 1.5, opacity: 1, y: -5, rotate: 15 }}
                          >
                            {e}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((msg, i) => {
                    const sender = allUsers.find((u) => u.username === msg.username);
                    const showDivider = unreadDividerMsgId && i > 0 && messages[i - 1].id === unreadDividerMsgId && msg.id !== unreadDividerMsgId;
                    return (
                      <Fragment key={msg.id}>
                        {showDivider && (
                          <div className="flex items-center gap-3 px-5 py-2">
                            <div className="flex-1 h-px bg-pink/30" />
                            <span className="text-[10px] text-pink font-medium uppercase tracking-wider">New</span>
                            <div className="flex-1 h-px bg-pink/30" />
                          </div>
                        )}
                        <MessageComp
                          message={msg}
                          isOwn={msg.username === username}
                          username={username}
                          isGrouped={isGrouped(i)}
                          isAdmin={isAdmin}
                          senderTitle={sender?.title}
                          replyMessage={replyLookup(msg.reply_to)}
                          onReply={(m) => setReplyingTo(m)}
                          onEdit={handleEditMessage}
                          onOpenProfile={handleOpenProfile}
                          onOpenLightbox={(url) => setLightboxUrl(url)}
                          onScrollToMessage={scrollToMessage}
                          isMuted={isMuted()}
                          pollData={pollLookup(msg.content)}
                          customEmojis={customEmojis}
                          allUsernames={allUsernames}
                          selectMode={selectMode}
                          isSelected={selectedMsgs.has(msg.id)}
                          onToggleSelect={(id) => setSelectedMsgs(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; })}
                        />
                      </Fragment>
                    );
                  })}
                </div>

                {/* Select mode floating bar */}
                <AnimatePresence>
                  {selectMode && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="sticky bottom-0 px-4 py-2.5 glass-strong border-t border-border flex items-center justify-between gap-3 z-10"
                    >
                      <button
                        onClick={() => {
                          if (selectedMsgs.size === messages.length) setSelectedMsgs(new Set());
                          else setSelectedMsgs(new Set(messages.map(m => m.id)));
                        }}
                        className="text-[10px] text-accent hover:text-accent-hover cursor-pointer font-medium px-3 py-1.5 rounded-lg hover:bg-accent/10 transition-colors"
                      >
                        {selectedMsgs.size === messages.length ? "Deselect All" : "Select All"}
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        disabled={selectedMsgs.size === 0}
                        className="text-[10px] bg-pink/15 hover:bg-pink/25 text-pink px-4 py-1.5 rounded-lg cursor-pointer transition-colors font-medium disabled:opacity-30"
                      >
                        Delete Selected ({selectedMsgs.size})
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <TypingIndicator users={typingUsers} />

                <AnimatePresence>
                  {newMsgCount > 0 && (
                    <motion.button
                      initial={{ opacity: 0, y: 20, scale: 0.7 }}
                      animate={{
                        opacity: 1,
                        y: [0, -5, 0],
                        scale: 1,
                      }}
                      exit={{ opacity: 0, y: 20, scale: 0.7 }}
                      transition={{
                        y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                        opacity: { duration: 0.2 },
                        scale: { type: "spring", stiffness: 400, damping: 15 },
                      }}
                      onClick={() => { scrollToBottom(); setNewMsgCount(0); }}
                      whileHover={{ scale: 1.1, boxShadow: "0 0 30px rgba(139,92,246,0.4)" }}
                      whileTap={{ scale: 0.9 }}
                      className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-gradient-to-r from-accent to-pink text-white text-xs font-semibold px-5 py-2.5 rounded-full cursor-pointer z-20 glow-accent btn-shimmer overflow-hidden"
                    >
                      {newMsgCount} new message{newMsgCount !== 1 ? "s" : ""} ↓
                    </motion.button>
                  )}
                </AnimatePresence>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
                  className="p-3 shrink-0 glass-strong relative border-t border-border"
                >
                  <div className="absolute top-0 left-0 right-0 glow-line" />

                  {/* Reply preview bar */}
                  <AnimatePresence>
                    {replyingTo && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mb-2"
                      >
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/5 border border-accent/20">
                          <span className="text-accent text-xs">↩️</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] text-accent/70 font-medium">{replyingTo.username}</span>
                            <p className="text-[11px] text-muted/50 truncate">{replyingTo.content}</p>
                          </div>
                          <button onClick={() => setReplyingTo(null)} className="text-muted/40 hover:text-muted text-xs cursor-pointer">✕</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {isMuted() ? (
                    <div className="relative flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-pink/5 border border-pink/20">
                      <span className="text-lg">🔇</span>
                      <span className="text-sm text-pink/80 font-medium">You are muted — {getMuteRemaining()} remaining</span>
                    </div>
                  ) : spamCooldown ? (
                    <div className="relative flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
                      <span className="text-lg">⏳</span>
                      <span className="text-sm text-orange-400/80 font-medium">Slow down — cooldown active</span>
                    </div>
                  ) : (
                  <div className="relative flex items-center gap-2" onPaste={handlePaste}>
                    <AnimatePresence>{showGifPicker && <GifPicker onSelect={(url) => { sendMediaMessage(url); setShowGifPicker(false); }} onClose={() => setShowGifPicker(false)} />}</AnimatePresence>
                    <AnimatePresence>{showEmojiPicker && <EmojiPicker onSelect={(emoji) => { setNewMessage((prev) => prev + emoji); setShowEmojiPicker(false); }} onClose={() => setShowEmojiPicker(false)} customEmojis={customEmojis} />}</AnimatePresence>
                    <AnimatePresence>{showStickerPicker && <StickerPicker onSelect={(sticker) => { sendMediaMessage(sticker); setShowStickerPicker(false); }} onClose={() => setShowStickerPicker(false)} customStickers={stickers} />}</AnimatePresence>
                    <AnimatePresence>{showPollCreator && <PollCreator onSubmit={handleCreatePoll} onCancel={() => setShowPollCreator(false)} />}</AnimatePresence>

                    <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*" onChange={handleFileUpload} className="hidden" />
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
                      onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); setShowStickerPicker(false); setShowPollCreator(false); }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={`text-[11px] shrink-0 font-black px-2.5 py-1.5 rounded-xl transition-all cursor-pointer tracking-wide ${showGifPicker ? "bg-accent/20 text-accent ring-1 ring-accent/30" : "text-muted hover:text-accent hover:bg-accent/10"}`}
                      title="GIFs"
                    >
                      GIF
                    </motion.button>
                    <motion.button
                      onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); setShowStickerPicker(false); setShowPollCreator(false); }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={`text-lg shrink-0 p-1.5 rounded-xl transition-all cursor-pointer ${showEmojiPicker ? "bg-accent/20 ring-1 ring-accent/30" : "hover:bg-surface-hover opacity-60 hover:opacity-100"}`}
                      title="Emoji picker"
                    >
                      😊
                    </motion.button>
                    <motion.button
                      onClick={() => { setShowStickerPicker(!showStickerPicker); setShowGifPicker(false); setShowEmojiPicker(false); setShowPollCreator(false); }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={`text-lg shrink-0 p-1.5 rounded-xl transition-all cursor-pointer ${showStickerPicker ? "bg-accent/20 ring-1 ring-accent/30" : "hover:bg-surface-hover opacity-60 hover:opacity-100"}`}
                      title="Stickers"
                    >
                      🌟
                    </motion.button>
                    {showVoiceRecorder ? (
                      <VoiceRecorder onSend={handleVoiceMessage} onCancel={() => setShowVoiceRecorder(false)} />
                    ) : (
                      <>
                        <motion.button
                          onClick={() => setShowVoiceRecorder(true)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="text-muted hover:text-accent transition-colors cursor-pointer text-lg shrink-0 p-1.5 rounded-xl hover:bg-accent/10"
                          title="Voice message"
                        >
                          🎤
                        </motion.button>
                        <MentionInput value={newMessage} onChange={setNewMessage} onSubmit={sendMessage} onTyping={broadcastTyping} placeholder={activeRoom.type === "dm" ? `Message ${activeRoomDisplayName}...` : `Message #${activeRoomDisplayName}...`} onlineUsers={onlineUsers} allUsers={mentionableUsers} currentUser={username} />
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
                      </>
                    )}
                  </div>
                  )}
                </motion.div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <motion.span
                    className="text-8xl block mb-5 inline-block"
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 12 }}
                  >
                    <motion.span
                      className="inline-block"
                      animate={{
                        y: [0, -20, 0],
                        rotate: [0, 10, -10, 0],
                        filter: ["drop-shadow(0 0 0px rgba(139,92,246,0))", "drop-shadow(0 0 40px rgba(139,92,246,0.5))", "drop-shadow(0 0 0px rgba(139,92,246,0))"],
                      }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    >
                      ⚡
                    </motion.span>
                  </motion.span>
                  <motion.h2
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 250, damping: 20 }}
                    className="text-3xl font-bold gradient-text text-glow mb-3"
                  >
                    Welcome!
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-muted/50 text-sm mb-6"
                  >
                    Select a room or create one to start chatting
                  </motion.p>
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    onClick={() => setSidebarOpen(true)}
                    whileHover={{ scale: 1.08, boxShadow: "0 0 25px rgba(139,92,246,0.2)" }}
                    whileTap={{ scale: 0.95 }}
                    className="md:hidden text-sm text-accent border border-accent/30 px-5 py-2.5 rounded-xl hover:bg-accent/10 transition-all cursor-pointer btn-glow"
                  >
                    Open Rooms
                  </motion.button>
                </div>
              </div>
            )}
          </div>

          {activeRoom && activeRoom.type !== "dm" && (
            <div className="hidden lg:block w-56 border-l border-border">
              <OnlineUsers users={onlineUsers} allUsers={allUsers} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
