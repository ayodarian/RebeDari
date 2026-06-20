-- RebeDari: Hacer sesiones privadas por pareja

-- ============================================================
-- AGREGAR session_id a todas las tablas de datos
-- ============================================================

ALTER TABLE public.fotos ADD COLUMN IF NOT EXISTS session_id text;
ALTER TABLE public.bitacora ADD COLUMN IF NOT EXISTS session_id text;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS session_id text;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS session_id text;
ALTER TABLE public.bingo_cells ADD COLUMN IF NOT EXISTS session_id text;
ALTER TABLE public.bingo_meta ADD COLUMN IF NOT EXISTS session_id text;

-- ============================================================
-- REESCRIBIR is_couple_member para que sea row-aware
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_couple_member(uid uuid, target_session_id text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = uid AND u.session_id = target_session_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- ELIMINAR POLICIES VIEJAS Y CREAR NUEVAS
-- ============================================================

-- fotos
DROP POLICY IF EXISTS "fotos_all" ON public.fotos;
CREATE POLICY "fotos_all" ON public.fotos
  FOR ALL USING (is_couple_member(auth.uid(), session_id));

-- bitacora
DROP POLICY IF EXISTS "bitacora_all" ON public.bitacora;
CREATE POLICY "bitacora_all" ON public.bitacora
  FOR ALL USING (is_couple_member(auth.uid(), session_id));

-- cartas
DROP POLICY IF EXISTS "cartas_all" ON public.cartas;
CREATE POLICY "cartas_all" ON public.cartas
  FOR ALL USING (is_couple_member(auth.uid(), session_id));

-- videos
DROP POLICY IF EXISTS "videos_all" ON public.videos;
CREATE POLICY "videos_all" ON public.videos
  FOR ALL USING (is_couple_member(auth.uid(), session_id));

-- bingo_cells
DROP POLICY IF EXISTS "bingo_cells_all" ON public.bingo_cells;
CREATE POLICY "bingo_cells_all" ON public.bingo_cells
  FOR ALL USING (is_couple_member(auth.uid(), session_id));

-- bingo_meta
DROP POLICY IF EXISTS "bingo_meta_all_auth" ON public.bingo_meta;
CREATE POLICY "bingo_meta_all" ON public.bingo_meta
  FOR ALL USING (is_couple_member(auth.uid(), session_id));

-- ============================================================
-- ASIGNAR DATOS VIEJOS A LA SESIÓN ACTUAL
-- ============================================================

UPDATE public.fotos SET session_id = (
  SELECT u.session_id FROM public.users u WHERE u.id = auth.uid()
) WHERE session_id IS NULL;

UPDATE public.bitacora SET session_id = (
  SELECT u.session_id FROM public.users u WHERE u.id = auth.uid()
) WHERE session_id IS NULL;

UPDATE public.cartas SET session_id = (
  SELECT u.session_id FROM public.users u WHERE u.id = auth.uid()
) WHERE session_id IS NULL;

UPDATE public.videos SET session_id = (
  SELECT u.session_id FROM public.users u WHERE u.id = auth.uid()
) WHERE session_id IS NULL;

UPDATE public.bingo_cells SET session_id = (
  SELECT u.session_id FROM public.users u WHERE u.id = auth.uid()
) WHERE session_id IS NULL;

UPDATE public.bingo_meta SET session_id = (
  SELECT u.session_id FROM public.users u WHERE u.id = auth.uid()
) WHERE session_id IS NULL;
