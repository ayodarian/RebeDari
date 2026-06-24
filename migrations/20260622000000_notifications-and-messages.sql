-- RebeDari: tablas notifications y messages

-- ============================================================
-- TABLAS
-- ============================================================

create table if not exists public.notifications (
  id bigint primary key generated always as identity,
  session_id text,
  sender_id uuid,
  sender_name text,
  type text,
  title text,
  message text,
  created_at timestamptz default now(),
  read boolean default false
);

create table if not exists public.messages (
  id bigint primary key generated always as identity,
  session_id text,
  sender_id uuid,
  sender_name text,
  sender_avatar text,
  type text,
  content text,
  file_name text,
  file_size bigint,
  duration integer,
  waveform jsonb,
  created_at timestamptz default now(),
  read boolean default false
);

-- ============================================================
-- RLS
-- ============================================================

alter table public.notifications enable row level security;
alter table public.messages enable row level security;

create policy "notifications_all" on public.notifications
  for all using (is_couple_member(auth.uid()));

create policy "messages_all" on public.messages
  for all using (is_couple_member(auth.uid()));
