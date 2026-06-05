# Alora Ops — Deploy Guide

## Step 1 — Create Supabase Project (2 min)

1. Go to https://supabase.com and sign in (free)
2. Click **New project**
3. Name it `alora-ops`, pick any region, set a password
4. Wait ~1 min for it to spin up
5. Go to **Settings → API**
6. Copy your **Project URL** and **anon public** key — you'll need these in Step 3

## Step 2 — Create the database table (1 min)

1. In your Supabase project, go to **SQL Editor → New query**
2. Paste the contents of `supabase-setup.sql`
3. Click **Run**
4. You should see "Success" — that's it

## Step 3 — Deploy to Vercel (2 min)

### Option A: GitHub (recommended)
1. Push this folder to a new GitHub repo
2. Go to https://vercel.com → **New Project** → import your repo
3. In the deploy settings, add these **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` → your Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your Supabase anon key
4. Click **Deploy**
5. Done — your URL will be `https://alora-ops-xyz.vercel.app`

### Option B: Vercel CLI
```bash
npm install -g vercel
cd alora-ops
vercel
# Follow prompts, then add env vars in Vercel dashboard
```

## Local Development

```bash
# 1. Copy env file
cp .env.local.example .env.local
# Edit .env.local with your Supabase keys

# 2. Install and run
npm install
npm run dev
# Open http://localhost:3000
```

## How data works

- All your checkboxes, notes, and task edits save to Supabase automatically (1.5s debounce after changes)
- You'll see "syncing…" → "✓ saved" in the top bar
- Data persists across devices — open on phone and desktop, both stay in sync
- Single row in Supabase (`id = 'main'`) stores everything as JSON
