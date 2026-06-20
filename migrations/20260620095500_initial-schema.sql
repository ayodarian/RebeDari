-- RebeDari: tablas + RLS para InsForge

-- ============================================================
-- TABLAS
-- ============================================================

create table if not exists public.users (
  id uuid primary key,
  email text,
  nombre text,
  session_id text,
  partner_id text,
  joined_at bigint,
  last_login bigint,
  created_at bigint
);

create table if not exists public.sessions (
  id bigint primary key generated always as identity,
  members uuid[] default '{}',
  is_open boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.fotos (
  id bigint primary key generated always as identity,
  url text,
  path text,
  caption text default 'Recuerdos',
  created_at timestamptz default now()
);

create table if not exists public.bitacora (
  id bigint primary key generated always as identity,
  date text,
  place text,
  "desc" text,
  image_url text,
  image_path text,
  created_at timestamptz default now()
);

create table if not exists public.cartas (
  id bigint primary key generated always as identity,
  titulo text,
  url text,
  path text,
  remitente text,
  fecha text,
  fecha_escritura text,
  description text,
  favorita boolean default false,
  tipo text,
  created_at timestamptz default now()
);

create table if not exists public.videos (
  id bigint primary key generated always as identity,
  url text,
  path text,
  caption text,
  created_at timestamptz default now()
);

create table if not exists public.bingo_cells (
  id bigint primary key generated always as identity,
  titulo text,
  descripcion text,
  realizada boolean default false,
  fecha_realizado text,
  created_by uuid,
  created_by_name text,
  created_at bigint,
  updated_at bigint,
  updated_by uuid,
  updated_by_name text
);

create table if not exists public.bingo_meta (
  id text primary key,
  wiped boolean,
  at bigint
);

-- ============================================================
-- RLS: Helper function
-- ============================================================

create or replace function public.is_couple_member(uid uuid)
returns boolean as $$
  select exists (
    select 1 from public.users u
    join public.sessions s on s.id::text = u.session_id
    where u.id = uid and uid = any(s.members)
  );
$$ language sql security definer;

-- ============================================================
-- RLS: Habilitar en todas las tablas
-- ============================================================

alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.fotos enable row level security;
alter table public.bitacora enable row level security;
alter table public.cartas enable row level security;
alter table public.videos enable row level security;
alter table public.bingo_cells enable row level security;
alter table public.bingo_meta enable row level security;

-- ============================================================
-- RLS: Policies
-- ============================================================

-- users: solo propio
create policy "users_own" on public.users
  for all using (id = auth.uid());

-- sessions
create policy "sessions_select" on public.sessions
  for select using (auth.uid() is not null);
create policy "sessions_insert" on public.sessions
  for insert with check (auth.uid() = any(members) and array_length(members, 1) <= 2);
create policy "sessions_update" on public.sessions
  for update using (is_couple_member(auth.uid()));

-- fotos
create policy "fotos_all" on public.fotos
  for all using (is_couple_member(auth.uid()));

-- bitacora
create policy "bitacora_all" on public.bitacora
  for all using (is_couple_member(auth.uid()));

-- cartas
create policy "cartas_all" on public.cartas
  for all using (is_couple_member(auth.uid()));

-- videos
create policy "videos_all" on public.videos
  for all using (is_couple_member(auth.uid()));

-- bingo_cells
create policy "bingo_cells_all" on public.bingo_cells
  for all using (is_couple_member(auth.uid()));

-- bingo_meta: lectura autenticada, escritura solo via function
create policy "bingo_meta_select" on public.bingo_meta
  for select using (auth.uid() is not null);
create policy "bingo_meta_insert" on public.bingo_meta
  for insert with check (false);
create policy "bingo_meta_update" on public.bingo_meta
  for update using (false);
create policy "bingo_meta_delete" on public.bingo_meta
  for delete using (false);
