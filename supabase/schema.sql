-- ============================================
-- Radiant Power Batch — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Users table (persistent guest accounts)
create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  avatar_color text not null,
  created_at timestamptz default now()
);

-- Rooms table
create table if not exists rooms (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  emoji text not null default '💬',
  created_at timestamptz default now()
);

-- Messages table
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete cascade not null,
  username text not null,
  avatar_color text not null default '#8B5CF6',
  content text not null,
  created_at timestamptz default now()
);

-- Reactions table
create table if not exists reactions (
  id uuid default gen_random_uuid() primary key,
  message_id uuid references messages(id) on delete cascade not null,
  username text not null,
  emoji text not null,
  created_at timestamptz default now(),
  unique(message_id, username, emoji)
);

-- Indexes
create index if not exists idx_messages_room_id on messages(room_id);
create index if not exists idx_messages_created_at on messages(created_at);
create index if not exists idx_reactions_message_id on reactions(message_id);

-- Enable Row Level Security (permissive for guest access)
alter table users enable row level security;
alter table rooms enable row level security;
alter table messages enable row level security;
alter table reactions enable row level security;

-- Policies
create policy "Anyone can read users" on users for select using (true);
create policy "Anyone can create users" on users for insert with check (true);

create policy "Anyone can read rooms" on rooms for select using (true);
create policy "Anyone can create rooms" on rooms for insert with check (true);

create policy "Anyone can read messages" on messages for select using (true);
create policy "Anyone can send messages" on messages for insert with check (true);
create policy "Anyone can delete own messages" on messages for delete using (true);

create policy "Anyone can read reactions" on reactions for select using (true);
create policy "Anyone can add reactions" on reactions for insert with check (true);
create policy "Anyone can remove reactions" on reactions for delete using (true);

-- Enable Realtime on tables
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table reactions;
alter publication supabase_realtime add table rooms;

-- Auto-cleanup: delete messages older than 24 hours
-- Call this with pg_cron or a scheduled function
create or replace function cleanup_old_messages() returns void as $$
  delete from messages where created_at < now() - interval '24 hours';
$$ language sql security definer;

-- To enable automatic cleanup every hour, enable pg_cron in Supabase Dashboard
-- (Database > Extensions > pg_cron), then run:
-- select cron.schedule('cleanup-messages', '0 * * * *', 'select cleanup_old_messages()');

-- Seed a default room
insert into rooms (name, emoji) values ('General', '💬')
on conflict do nothing;
