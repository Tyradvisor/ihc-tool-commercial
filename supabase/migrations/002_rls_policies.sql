-- 002_rls_policies.sql
-- IHC Tool™ Comercial - Row Level Security (RLS) Policies
-- Created: 2026-05-26

-- Enable RLS on all tables
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE licencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE activaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_licencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CLIENTES POLICIES
-- ============================================

-- Admins can view all clients
CREATE POLICY "Admins can view all clients" ON clientes
  FOR SELECT USING (
    auth.uid()::text IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );

-- Users can view their own client (via licencias relationship)
CREATE POLICY "Users can view their own client" ON clientes
  FOR SELECT USING (
    id IN (
      SELECT cliente_id FROM licencias
      WHERE auth_user_id = auth.uid()::text
    )
  );

-- Admins can update all clients
CREATE POLICY "Admins can update all clients" ON clientes
  FOR UPDATE USING (
    auth.uid()::text IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );

-- Admins can insert clients
CREATE POLICY "Admins can insert clients" ON clientes
  FOR INSERT WITH CHECK (
    auth.uid()::text IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );

-- ============================================
-- PLANES POLICIES
-- ============================================

-- Everyone can view plans (they're public)
CREATE POLICY "Everyone can view plans" ON planes
  FOR SELECT USING (true);

-- Only admins can manage plans
CREATE POLICY "Admins can manage plans" ON planes
  FOR ALL USING (
    auth.uid()::text IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );

-- ============================================
-- LICENCIAS POLICIES
-- ============================================

-- Admins can view all licenses
CREATE POLICY "Admins can view all licenses" ON licencias
  FOR SELECT USING (
    auth.uid()::text IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );

-- Users can view their own license
CREATE POLICY "Users can view their own license" ON licencias
  FOR SELECT USING (
    auth_user_id = auth.uid()::text
  );

-- Only admins can update licenses
CREATE POLICY "Admins can update licenses" ON licencias
  FOR UPDATE USING (
    auth.uid()::text IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );

-- Only admins can insert licenses
CREATE POLICY "Admins can insert licenses" ON licencias
  FOR INSERT WITH CHECK (
    auth.uid()::text IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );

-- ============================================
-- ACTIVACIONES POLICIES
-- ============================================

-- Admins can view all activations
CREATE POLICY "Admins can view all activations" ON activaciones
  FOR SELECT USING (
    auth.uid()::text IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );

-- Users can view their own license's activations
CREATE POLICY "Users can view their license activations" ON activaciones
  FOR SELECT USING (
    licencia_id IN (
      SELECT id FROM licencias WHERE auth_user_id = auth.uid()::text
    )
  );

-- Only admins can manage activations
CREATE POLICY "Admins can manage activations" ON activaciones
  FOR ALL USING (
    auth.uid()::text IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );

-- Service role (Edge Functions) can update activations
-- This is handled via service_role key in functions, not via RLS

-- ============================================
-- EVENTOS_LICENCIA POLICIES
-- ============================================

-- Admins can view all license events
CREATE POLICY "Admins can view all events" ON eventos_licencia
  FOR SELECT USING (
    auth.uid()::text IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );

-- Users can view their own license's events
CREATE POLICY "Users can view their license events" ON eventos_licencia
  FOR SELECT USING (
    licencia_id IN (
      SELECT id FROM licencias WHERE auth_user_id = auth.uid()::text
    )
  );

-- Only Edge Functions (service role) can insert events
-- This is handled via service_role key in functions, not via RLS

-- ============================================
-- USER_ROLES POLICIES
-- ============================================

-- Users can view their own role
CREATE POLICY "Users can view their own role" ON user_roles
  FOR SELECT USING (
    user_id = auth.uid()::text
  );

-- Admins can view all roles
CREATE POLICY "Admins can view all roles" ON user_roles
  FOR SELECT USING (
    auth.uid()::text IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );

-- Only admins can manage roles
CREATE POLICY "Admins can manage roles" ON user_roles
  FOR ALL USING (
    auth.uid()::text IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );

-- ============================================
-- EDGE FUNCTIONS SERVICE ROLE NOTES
-- ============================================

-- Edge Functions use Supabase service_role_key which bypasses RLS
-- These functions use direct database access:
-- - validate-license: inserts into activaciones, licencias, eventos_licencia
-- - heartbeat: reads/updates licencias, activaciones, eventos_licencia
-- - send-email: reads user_roles for admin check

-- RLS policies above protect against unauthorized direct client access
-- Edge Functions maintain their own authorization (JWT validation, admin check)

-- ============================================
-- SEED DATA
-- ============================================

-- Note: The initial plans are seeded in 001_initial_schema.sql
-- The admin users and client data should be added via app or manual migration
