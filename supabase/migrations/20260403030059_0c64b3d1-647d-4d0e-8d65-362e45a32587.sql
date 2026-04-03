
-- Fix INSERT policy: change from public to authenticated
DROP POLICY IF EXISTS "users_own_connections_insert" ON public.mp_connections;
CREATE POLICY "users_own_connections_insert"
ON public.mp_connections
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Fix DELETE policy: change from public to authenticated
DROP POLICY IF EXISTS "users_own_connections_delete" ON public.mp_connections;
CREATE POLICY "users_own_connections_delete"
ON public.mp_connections
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Fix UPDATE policy: change from public to authenticated
DROP POLICY IF EXISTS "users_own_connections_update" ON public.mp_connections;
CREATE POLICY "users_own_connections_update"
ON public.mp_connections
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Fix SELECT policy: change from public to authenticated
DROP POLICY IF EXISTS "users_own_connections_select" ON public.mp_connections;
CREATE POLICY "users_own_connections_select"
ON public.mp_connections
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Also fix user_settings policies to authenticated only
DROP POLICY IF EXISTS "users_own_settings_select" ON public.user_settings;
CREATE POLICY "users_own_settings_select" ON public.user_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_own_settings_insert" ON public.user_settings;
CREATE POLICY "users_own_settings_insert" ON public.user_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_own_settings_update" ON public.user_settings;
CREATE POLICY "users_own_settings_update" ON public.user_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_own_settings_delete" ON public.user_settings;
CREATE POLICY "users_own_settings_delete" ON public.user_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);
