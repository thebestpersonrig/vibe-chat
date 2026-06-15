# Vibe Chat 💬

Real-time group chat with vibes. Built with Next.js, Supabase, and Framer Motion.

## Features

- **Guest login** — just pick a name and start chatting
- **Chat rooms** — create rooms with custom names and emoji icons
- **Real-time messaging** — instant message delivery via Supabase Realtime
- **Online presence** — see who's in the room
- **Typing indicators** — see when someone is typing
- **Message reactions** — react with emoji
- **Beautiful UI** — dark glassmorphism design with smooth animations

## Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase/schema.sql`
3. Copy your project URL and anon key from Settings → API

### 2. Environment

```bash
cp .env.local.example .env.local
# Fill in your Supabase URL and anon key
```

### 3. Run

```bash
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000) and start chatting.

## Deploy to Vercel

1. Push to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Add your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables
4. Deploy

## Tech Stack

- [Next.js 15](https://nextjs.org) (App Router)
- [Supabase](https://supabase.com) (Postgres + Realtime)
- [Tailwind CSS](https://tailwindcss.com)
- [Framer Motion](https://www.framer.com/motion)
- TypeScript
