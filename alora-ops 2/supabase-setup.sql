-- Run this in your Supabase SQL Editor
-- (Dashboard → SQL Editor → New query → paste → Run)

create table if not exists alora_ops (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz default now()
);

-- Allow all operations (no auth needed since this is personal)
alter table alora_ops enable row level security;

create policy "allow all" on alora_ops
  for all using (true) with check (true);
