-- Fix RLS policies for notifications and messages
-- Replace is_couple_member with auth_uid pattern matching the rest of the project

-- notifications: drop old policy, create simplified one
DROP POLICY IF EXISTS "notifications_all" ON public.notifications;
CREATE POLICY "notifications_authenticated" ON public.notifications
  FOR ALL USING ((SELECT auth_uid()) IS NOT NULL);

-- messages: drop old policy, create simplified one
DROP POLICY IF EXISTS "messages_all" ON public.messages;
CREATE POLICY "messages_authenticated" ON public.messages
  FOR ALL USING ((SELECT auth_uid()) IS NOT NULL);
