-- 002_rls_policies.sql
-- IHC Tool™ Comercial - Row Level Security (RLS)
--
-- IMPORTANT: This file was rewritten on 2026-05-28 to match the actual
-- state of the database (which had drifted from the original 001/002
-- migrations during development). The original version referenced a
-- "role" column and "'user'" value, but the live schema uses "rol" and
-- ('admin' | 'cliente').
--
-- The audit performed in security review #10 confirmed:
--  - RLS is enabled on all public tables
--  - Authorization is centralized in the es_admin() helper function
--  - Edge Functions bypass RLS via SUPABASE_SERVICE_ROLE_KEY
--
-- This file is the canonical source-of-truth going forward. If you change
-- anything in the Supabase Dashboard, also update this file and commit it.

-- ============================================================
-- HELPER FUNCTION: es_admin()
-- ============================================================
-- Returns true iff the currently authenticated user has rol = 'admin'.
-- Used by every "admin-only" policy below.

CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND rol = 'admin'
  );
$function$;

COMMENT ON FUNCTION public.es_admin() IS
  'Returns true if the authenticated user has admin role. Used by RLS policies on all admin-restricted operations.';

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE public.clientes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licencias         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activaciones      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_licencia  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles        ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CLIENTES
-- ============================================================
-- Admins can do anything; users can read the client linked to their licencia.

DROP POLICY IF EXISTS clientes_select         ON public.clientes;
DROP POLICY IF EXISTS clientes_modify         ON public.clientes;
DROP POLICY IF EXISTS admins_delete_clientes  ON public.clientes;

CREATE POLICY clientes_select ON public.clientes
  FOR SELECT
  USING (
    es_admin()
    OR id IN (
      SELECT cliente_id FROM public.licencias
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY clientes_modify ON public.clientes
  FOR ALL
  USING (es_admin())
  WITH CHECK (es_admin());

CREATE POLICY admins_delete_clientes ON public.clientes
  FOR DELETE
  USING (es_admin());

-- ============================================================
-- PLANES
-- ============================================================
-- Plans are public catalog data; anyone (even unauthenticated) can read.
-- Only admins can mutate them.

DROP POLICY IF EXISTS planes_select  ON public.planes;
DROP POLICY IF EXISTS planes_modify  ON public.planes;

CREATE POLICY planes_select ON public.planes
  FOR SELECT
  USING (true);

CREATE POLICY planes_modify ON public.planes
  FOR ALL
  USING (es_admin())
  WITH CHECK (es_admin());

-- ============================================================
-- LICENCIAS
-- ============================================================
-- Admins can do everything; users can read their own license.

DROP POLICY IF EXISTS licencias_select          ON public.licencias;
DROP POLICY IF EXISTS licencias_modify          ON public.licencias;
DROP POLICY IF EXISTS admins_insert_licencias   ON public.licencias;
DROP POLICY IF EXISTS admins_update_licencias   ON public.licencias;

CREATE POLICY licencias_select ON public.licencias
  FOR SELECT
  USING (
    es_admin() OR auth_user_id = auth.uid()
  );

CREATE POLICY licencias_modify ON public.licencias
  FOR ALL
  USING (es_admin())
  WITH CHECK (es_admin());

CREATE POLICY admins_insert_licencias ON public.licencias
  FOR INSERT
  WITH CHECK (es_admin());

CREATE POLICY admins_update_licencias ON public.licencias
  FOR UPDATE
  USING (es_admin())
  WITH CHECK (es_admin());

-- ============================================================
-- ACTIVACIONES
-- ============================================================
-- Admins see everything; a user sees activaciones of their own license.
-- Edge Functions (validate-license, heartbeat) insert/update with
-- service_role and bypass RLS.

DROP POLICY IF EXISTS activaciones_select  ON public.activaciones;
DROP POLICY IF EXISTS activaciones_modify  ON public.activaciones;

CREATE POLICY activaciones_select ON public.activaciones
  FOR SELECT
  USING (
    es_admin()
    OR licencia_id IN (
      SELECT id FROM public.licencias WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY activaciones_modify ON public.activaciones
  FOR ALL
  USING (es_admin())
  WITH CHECK (es_admin());

-- ============================================================
-- EVENTOS_LICENCIA
-- ============================================================
-- Admin-only reads. Inserts are blocked from RLS (only Edge Functions
-- via service_role can write events). This prevents authenticated
-- clients from spamming the audit log with fake events.

DROP POLICY IF EXISTS eventos_select  ON public.eventos_licencia;
DROP POLICY IF EXISTS eventos_insert  ON public.eventos_licencia;

CREATE POLICY eventos_select ON public.eventos_licencia
  FOR SELECT
  USING (es_admin());

-- Locked-down INSERT: only service_role (bypassing RLS) can write.
-- See security audit ticket #17.
CREATE POLICY eventos_insert ON public.eventos_licencia
  FOR INSERT
  WITH CHECK (false);

-- ============================================================
-- USER_ROLES
-- ============================================================
-- Only admins can list and manage roles. Users can't even see their
-- own row (intentional: prevents enumeration of who is admin).

DROP POLICY IF EXISTS user_roles_all  ON public.user_roles;

CREATE POLICY user_roles_all ON public.user_roles
  FOR ALL
  USING (es_admin())
  WITH CHECK (es_admin());

-- ============================================================
-- INTENTOS_LOGIN  (created in 003_persistent_rate_limit.sql)
-- ============================================================
-- RLS enabled with NO policies => only service_role can read/write.
-- Edge Functions write through service_role; no client should touch it.

-- ============================================================
-- NOTES ON SERVICE ROLE
-- ============================================================
-- Edge Functions (validate-license, heartbeat, send-email) authenticate
-- with the service_role JWT and therefore BYPASS all the policies above.
-- They enforce their own checks:
--   - validate-license: rate limit on intentos_login + Supabase Auth
--   - heartbeat: signed JWT verification + fingerprint match
--   - send-email: Supabase Auth getUser() + es_admin() check
--
-- Never expose SUPABASE_SERVICE_ROLE_KEY to client code. It lives only
-- in Edge Function secrets and in the Streamlit admin panel secrets.

-- ============================================================
-- SEED DATA
-- ============================================================
-- The initial plans are seeded in 001_initial_schema.sql.
-- Admin users are created manually:
--   1. Sign up via Supabase Auth (with the desired email/password)
--   2. INSERT INTO user_roles (user_id, rol) VALUES ('<uuid>', 'admin');
