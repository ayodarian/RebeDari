-- Fix security and performance issues flagged by InsForge Advisor

-- ============================================================
-- SECURITY: Fix dangerous SECURITY DEFINER functions
-- ============================================================

ALTER FUNCTION public.is_couple_member(uuid) SET search_path = '';
ALTER FUNCTION public.is_couple_member(uuid, text) SET search_path = '';
ALTER FUNCTION public.get_partner_id(text) SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.is_couple_member(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.is_couple_member(uuid, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_partner_id(text) FROM public;

-- ============================================================
-- PERFORMANCE: Create auth_uid() helper function
-- ============================================================

CREATE OR REPLACE FUNCTION public.auth_uid()
RETURNS uuid AS $$
  SELECT auth.uid();
$$ LANGUAGE sql STABLE;

-- ============================================================
-- PERFORMANCE: Rewrite RLS policies with subquery wrapper
-- ============================================================

-- users
DROP POLICY IF EXISTS "users_own" ON public.users;
CREATE POLICY "users_own" ON public.users
  FOR ALL USING (id = (SELECT auth_uid()));

-- sessions
DROP POLICY IF EXISTS "sessions_select" ON public.sessions;
CREATE POLICY "sessions_select" ON public.sessions
  FOR SELECT USING ((SELECT auth_uid()) IS NOT NULL);

DROP POLICY IF EXISTS "sessions_insert" ON public.sessions;
CREATE POLICY "sessions_insert" ON public.sessions
  FOR INSERT WITH CHECK ((SELECT auth_uid()) = ANY(members) AND array_length(members, 1) <= 2);

DROP POLICY IF EXISTS "sessions_update" ON public.sessions;
CREATE POLICY "sessions_update" ON public.sessions
  FOR UPDATE USING ((SELECT auth_uid()) = ANY(members));

-- fotos
DROP POLICY IF EXISTS "fotos_all" ON public.fotos;
CREATE POLICY "fotos_all" ON public.fotos
  FOR ALL USING (is_couple_member((SELECT auth_uid()), session_id));

-- bitacora
DROP POLICY IF EXISTS "bitacora_all" ON public.bitacora;
CREATE POLICY "bitacora_all" ON public.bitacora
  FOR ALL USING (is_couple_member((SELECT auth_uid()), session_id));

-- cartas
DROP POLICY IF EXISTS "cartas_all" ON public.cartas;
CREATE POLICY "cartas_all" ON public.cartas
  FOR ALL USING (is_couple_member((SELECT auth_uid()), session_id));

-- videos
DROP POLICY IF EXISTS "videos_all" ON public.videos;
CREATE POLICY "videos_all" ON public.videos
  FOR ALL USING (is_couple_member((SELECT auth_uid()), session_id));

-- bingo_cells
DROP POLICY IF EXISTS "bingo_cells_all" ON public.bingo_cells;
CREATE POLICY "bingo_cells_all" ON public.bingo_cells
  FOR ALL USING (is_couple_member((SELECT auth_uid()), session_id));

-- bingo_meta
DROP POLICY IF EXISTS "bingo_meta_select" ON public.bingo_meta;
CREATE POLICY "bingo_meta_select" ON public.bingo_meta
  FOR SELECT USING ((SELECT auth_uid()) IS NOT NULL);

DROP POLICY IF EXISTS "bingo_meta_all" ON public.bingo_meta;
CREATE POLICY "bingo_meta_all" ON public.bingo_meta
  FOR ALL USING (is_couple_member((SELECT auth_uid()), session_id));

-- invites
DROP POLICY IF EXISTS "invites_select_own" ON public.invites;
CREATE POLICY "invites_select_own" ON public.invites
  FOR SELECT USING ((SELECT auth_uid()) = created_by);

DROP POLICY IF EXISTS "invites_insert_auth" ON public.invites;
CREATE POLICY "invites_insert_auth" ON public.invites
  FOR INSERT WITH CHECK ((SELECT auth_uid()) = created_by);

DROP POLICY IF EXISTS "invites_update_auth" ON public.invites;
CREATE POLICY "invites_update_auth" ON public.invites
  FOR UPDATE USING ((SELECT auth_uid()) IS NOT NULL);

-- ============================================================
-- HEALTH: Create missing index
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_invites_created_by ON public.invites(created_by);

-- ============================================================
-- HEALTH: Vacuum and tune autovacuum for fotos
-- ============================================================

ALTER TABLE fotos SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);
