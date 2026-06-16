export interface Room {
  id: string;
  name: string;
  emoji: string;
  created_at: string;
}

export interface Message {
  id: string;
  room_id: string;
  username: string;
  avatar_color: string;
  avatar_url?: string | null;
  content: string;
  created_at: string;
  reactions?: Reaction[];
}

export interface Reaction {
  id: string;
  message_id: string;
  username: string;
  emoji: string;
}

export interface User {
  id: string;
  username: string;
  avatar_color: string;
  avatar_url?: string | null;
  created_at: string;
}

export interface UserPresence {
  username: string;
  avatar_color: string;
  avatar_url?: string | null;
  online_at: string;
}

export interface GiphyGif {
  id: string;
  title: string;
  images: {
    fixed_height_small: { url: string };
    fixed_height: { url: string };
    original: { url: string };
  };
}

export const AVATAR_COLORS = [
  "#8B5CF6", "#EC4899", "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#06B6D4", "#F97316", "#A855F7", "#14B8A6", "#E879F9", "#6366F1",
];

export const ROOM_EMOJIS = [
  "💬", "🔥", "🎮", "🎵", "🚀", "💡", "🌙", "⚡",
  "🎨", "🌊", "🍕", "👾", "🦄", "🌈", "🎯", "🧪",
];

export const REACTION_EMOJIS = ["❤️", "😂", "🔥", "👍", "😮", "🎉", "💯", "👀"];

export function detectMedia(content: string): {
  type: "image" | "gif" | "youtube" | "video" | null;
  url: string;
  text: string;
} {
  const trimmed = content.trim();
  if (/^https?:\/\/.+\.(jpg|jpeg|png|webp|avif)(\?.*)?$/i.test(trimmed))
    return { type: "image", url: trimmed, text: "" };
  if (/^https?:\/\/.+\.gif(\?.*)?$/i.test(trimmed) || /^https?:\/\/media\d*\.giphy\.com\//i.test(trimmed))
    return { type: "gif", url: trimmed, text: "" };
  if (/^https?:\/\/.+\.(mp4|webm|mov)(\?.*)?$/i.test(trimmed))
    return { type: "video", url: trimmed, text: "" };
  const ytMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    const remaining = trimmed.replace(ytMatch[0], "").trim();
    return { type: "youtube", url: ytMatch[1], text: remaining };
  }
  return { type: null, url: "", text: trimmed };
}
