-- Agregar columnas de avatar a tabla users

alter table public.users
add column if not exists avatar_url text,
add column if not exists avatar_path text;
