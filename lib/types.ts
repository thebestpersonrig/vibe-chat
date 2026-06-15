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

export interface UserPresence {
  username: string;
  avatar_color: string;
  online_at: string;
}

export const AVATAR_COLORS = [
  "#8B5CF6",
  "#EC4899",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#06B6D4",
  "#F97316",
  "#A855F7",
  "#14B8A6",
  "#E879F9",
  "#6366F1",
];

export const ROOM_EMOJIS = [
  "💬", "🔥", "🎮", "🎵", "🚀", "💡", "🌙", "⚡",
  "🎨", "🌊", "🍕", "👾", "🦄", "🌈", "🎯", "🧪",
];

export const REACTION_EMOJIS = ["❤️", "😂", "🔥", "👍", "😮", "🎉", "💯", "👀"];
