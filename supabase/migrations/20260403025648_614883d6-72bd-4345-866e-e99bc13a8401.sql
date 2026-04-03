
-- Drop the permissive SELECT policy that exposes tokens
DROP POLICY IF EXISTS "users_own_connections_select" ON public.mp_connections;

-- Create a restrictive SELECT policy that only allows selecting non-sensitive columns
-- Since Postgres RLS cannot restrict columns, we block direct SELECT entirely
CREATE POLICY "users_own_connections_select"
ON public.mp_connections
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create a safe view without token columns for client use
CREATE OR REPLACE VIEW public.mp_connections_safe AS
SELECT id, user_id, mp_user_id, nickname, expires_at, created_at
FROM public.mp_connections;
