-- ============================================
-- Vibe Chat — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================

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
alter table rooms enable row level security;
alter table messages enable row level security;
alter table reactions enable row level security;

-- Policies: allow all operations for anonymous users
create policy "Anyone can read rooms" on rooms for select using (true);
create policy "Anyone can create rooms" on rooms for insert with check (true);

create policy "Anyone can read messages" on messages for select using (true);
create policy "Anyone can send messages" on messages for insert with check (true);
create policy "Anyone can delete messages" on messages for delete using (true);

create policy "Anyone can read reactions" on reactions for select using (true);
create policy "Anyone can add reactions" on reactions for insert with check (true);
create policy "Anyone can remove reactions" on reactions for delete using (true);

-- Enable Realtime on tables
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table reactions;
alter publication supabase_realtime add table rooms;

-- Seed a default room
insert into rooms (name, emoji) values ('General', '💬')
on conflict do nothing;
