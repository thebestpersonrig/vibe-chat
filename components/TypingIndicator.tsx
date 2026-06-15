"use client";

interface TypingIndicatorProps {
  users: string[];
}

export default function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const text =
    users.length === 1
      ? `${users[0]} is typing`
      : users.length === 2
        ? `${users[0]} and ${users[1]} are typing`
        : `${users[0]} and ${users.length - 1} others are typing`;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted">
      <div className="flex gap-0.5">
        <span className="typing-dot w-1.5 h-1.5 bg-accent rounded-full inline-block" />
        <span className="typing-dot w-1.5 h-1.5 bg-accent rounded-full inline-block" />
        <span className="typing-dot w-1.5 h-1.5 bg-accent rounded-full inline-block" />
      </div>
      <span>{text}</span>
    </div>
  );
}
