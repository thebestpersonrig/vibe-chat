-- ============================================
-- Radiant Power Batch — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Users table (persistent guest accounts)
create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  avatar_color text not null,
  avatar_url text,
  password_hash text,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- Rooms table
create table if not exists rooms (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  emoji text not null default '💬',
  type text not null default 'group',
  created_at timestamptz default now()
);

-- Room members (for DMs)
create table if not exists room_members (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete cascade not null,
  username text not null,
  created_at timestamptz default now(),
  unique(room_id, username)
);

-- Messages table
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete cascade not null,
  username text not null,
  avatar_color text not null default '#8B5CF6',
  avatar_url text,
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
create index if not exists idx_room_members_room_id on room_members(room_id);
create index if not exists idx_room_members_username on room_members(username);

-- Enable Row Level Security (permissive for guest access)
alter table users enable row level security;
alter table rooms enable row level security;
alter table messages enable row level security;
alter table reactions enable row level security;
alter table room_members enable row level security;

-- Policies
create policy "Anyone can read users" on users for select using (true);
create policy "Anyone can create users" on users for insert with check (true);
create policy "Anyone can update own avatar" on users for update using (true) with check (true);
create policy "Anyone can delete own account" on users for delete using (true);

create policy "Anyone can read rooms" on rooms for select using (true);
create policy "Anyone can create rooms" on rooms for insert with check (true);
create policy "Anyone can delete rooms" on rooms for delete using (true);

create policy "Anyone can read messages" on messages for select using (true);
create policy "Anyone can send messages" on messages for insert with check (true);
create policy "Anyone can delete own messages" on messages for delete using (true);

create policy "Anyone can read reactions" on reactions for select using (true);
create policy "Anyone can add reactions" on reactions for insert with check (true);
create policy "Anyone can remove reactions" on reactions for delete using (true);

create policy "Anyone can read room_members" on room_members for select using (true);
create policy "Anyone can add room_members" on room_members for insert with check (true);
create policy "Anyone can delete room_members" on room_members for delete using (true);

-- Enable Realtime on tables
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table reactions;
alter publication supabase_realtime add table rooms;

-- Auto-cleanup: delete messages older than 24 hours
-- Call this with pg_cron or a scheduled function
create or replace function cleanup_old_messages() returns void as $$
  delete from messages where created_at < now() - interval '24 hours';
$$ language sql security definer;

-- Seed a default room
insert into rooms (name, emoji, type) values ('General', '💬', 'group')
on conflict do nothing;

-- ============================================
-- Storage Setup
-- ============================================
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "Anyone can upload media"
on storage.objects for insert
with check (bucket_id = 'media');

create policy "Anyone can read media"
on storage.objects for select
using (bucket_id = 'media');
