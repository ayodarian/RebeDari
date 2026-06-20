-- RebeDari: Sistema de invites + fixes

-- ============================================================
-- TABLA: invites
-- ============================================================

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  created_by uuid not null,
  created_at bigint default (extract(epoch from now()) * 1000),
  used_by uuid,
  used_at bigint
);

-- ============================================================
-- RLS: invites
-- ============================================================

alter table public.invites enable row level security;

create policy "invites_select_own" on public.invites
  for select using (auth.uid() = created_by);

create policy "invites_insert_auth" on public.invites
  for insert with check (auth.uid() = created_by);

create policy "invites_update_auth" on public.invites
  for update using (auth.uid() is not null);

-- ============================================================
-- FIX: bingo_meta RLS
-- ============================================================

drop policy if exists "bingo_meta_insert" on public.bingo_meta;
drop policy if exists "bingo_meta_update" on public.bingo_meta;
drop policy if exists "bingo_meta_delete" on public.bingo_meta;

create policy "bingo_meta_all_auth" on public.bingo_meta
  for all using (auth.uid() is not null);

-- ============================================================
-- LIMPIEZA: Sessions viejas de Firebase
-- ============================================================

delete from public.sessions where id in (2, 3, 4);
