-- Simplificar RLS: cualquier usuario autenticado puede acceder a contenido

-- fotos: acceso total para autenticados
DROP POLICY IF EXISTS "fotos_all" ON public.fotos;
CREATE POLICY "fotos_authenticated" ON public.fotos
  FOR ALL USING ((SELECT auth_uid()) IS NOT NULL);

-- videos: acceso total para autenticados
DROP POLICY IF EXISTS "videos_all" ON public.videos;
CREATE POLICY "videos_authenticated" ON public.videos
  FOR ALL USING ((SELECT auth_uid()) IS NOT NULL);

-- cartas: acceso total para autenticados
DROP POLICY IF EXISTS "cartas_all" ON public.cartas;
CREATE POLICY "cartas_authenticated" ON public.cartas
  FOR ALL USING ((SELECT auth_uid()) IS NOT NULL);

-- bitacora: acceso total para autenticados
DROP POLICY IF EXISTS "bitacora_all" ON public.bitacora;
CREATE POLICY "bitacora_authenticated" ON public.bitacora
  FOR ALL USING ((SELECT auth_uid()) IS NOT NULL);

-- bingo_cells: acceso total para autenticados
DROP POLICY IF EXISTS "bingo_cells_all" ON public.bingo_cells;
CREATE POLICY "bingo_cells_authenticated" ON public.bingo_cells
  FOR ALL USING ((SELECT auth_uid()) IS NOT NULL);

-- bingo_meta: acceso total para autenticados
DROP POLICY IF EXISTS "bingo_meta_all" ON public.bingo_meta;
DROP POLICY IF EXISTS "bingo_meta_select" ON public.bingo_meta;
CREATE POLICY "bingo_meta_authenticated" ON public.bingo_meta
  FOR ALL USING ((SELECT auth_uid()) IS NOT NULL);

-- invites: cualquier autenticado puede ver y usar
DROP POLICY IF EXISTS "invites_select_own" ON public.invites;
DROP POLICY IF EXISTS "invites_insert_auth" ON public.invites;
DROP POLICY IF EXISTS "invites_update_auth" ON public.invites;
CREATE POLICY "invites_authenticated" ON public.invites
  FOR ALL USING ((SELECT auth_uid()) IS NOT NULL);
