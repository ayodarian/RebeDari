-- Drop dead SECURITY DEFINER functions flagged by InsForge Advisor
-- These functions are no longer referenced by any RLS policy or app code:
-- - get_partner_id: was never used in app code (created outside version control)
-- - is_couple_member: replaced by auth_uid() in simplify-rls-policies

REVOKE EXECUTE ON FUNCTION public.get_partner_id(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_couple_member(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_couple_member(uuid, text) FROM authenticated;

DROP FUNCTION IF EXISTS public.get_partner_id(text);
DROP FUNCTION IF EXISTS public.is_couple_member(uuid);
DROP FUNCTION IF EXISTS public.is_couple_member(uuid, text);
