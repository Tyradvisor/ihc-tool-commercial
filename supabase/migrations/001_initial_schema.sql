-- 001_initial_schema.sql
-- IHC Tool™ Comercial - Initial Database Schema
-- Created: 2026-05-26

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CLIENTES TABLE (Companies using IHC Tool)
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  razon_social TEXT NOT NULL,
  rut TEXT,
  email_contacto TEXT,
  telefono TEXT,
  direccion TEXT,
  ciudad TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. PLANES TABLE (License Plans: Starter, Pro, Enterprise)
CREATE TABLE planes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  max_dispositivos INTEGER NOT NULL DEFAULT 1,
  max_skus INTEGER NOT NULL DEFAULT 1000,
  dias_offline INTEGER NOT NULL DEFAULT 7,
  export_xlsx BOOLEAN DEFAULT false,
  causas_raiz BOOLEAN DEFAULT false,
  madurez BOOLEAN DEFAULT false,
  feature_flags JSONB DEFAULT '{}',
  precio_mensual DECIMAL(10, 2),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. LICENCIAS TABLE (License Records per Client)
CREATE TABLE licencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES planes(id),
  auth_user_id TEXT NOT NULL UNIQUE,
  estado TEXT DEFAULT 'activa' CHECK (estado IN ('activa', 'suspendida', 'revocada', 'expirada')),
  fecha_inicio DATE NOT NULL,
  fecha_expiracion DATE NOT NULL,
  cantidad_dispositivos_permitidos INTEGER,
  email_principal TEXT,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. ACTIVACIONES TABLE (Device Activations per License)
CREATE TABLE activaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  licencia_id UUID NOT NULL REFERENCES licencias(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  user_agent TEXT,
  ip_first TEXT,
  ip_last TEXT,
  activa BOOLEAN DEFAULT true,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for faster device lookups
CREATE INDEX idx_activaciones_licencia_fingerprint ON activaciones(licencia_id, fingerprint);
CREATE INDEX idx_activaciones_fingerprint ON activaciones(fingerprint);

-- 5. EVENTOS_LICENCIA TABLE (Audit Log for License Events)
CREATE TABLE eventos_licencia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  licencia_id UUID REFERENCES licencias(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  detalle JSONB,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for audit trail
CREATE INDEX idx_eventos_licencia_created_at ON eventos_licencia(created_at DESC);
CREATE INDEX idx_eventos_licencia_tipo ON eventos_licencia(tipo);

-- 6. USER_ROLES TABLE (Admin and User Roles)
CREATE TABLE user_roles (
  user_id TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Seed initial plans (Starter, Pro, Enterprise)
INSERT INTO planes (nombre, descripcion, max_dispositivos, max_skus, dias_offline, export_xlsx, causas_raiz, madurez, feature_flags) VALUES
(
  'starter',
  'Plan básico para pequeños negocios',
  1,
  1000,
  7,
  false,
  false,
  false,
  '{}'::jsonb
),
(
  'pro',
  'Plan profesional con exportación y análisis de causas',
  5,
  5000,
  14,
  true,
  true,
  false,
  '{"export_xlsx": true, "causas_raiz": true}'::jsonb
),
(
  'enterprise',
  'Plan empresarial con todas las características',
  -1,
  -1,
  30,
  true,
  true,
  true,
  '{"export_xlsx": true, "causas_raiz": true, "madurez": true}'::jsonb
);

-- Create indexes for common queries
CREATE INDEX idx_licencias_cliente_id ON licencias(cliente_id);
CREATE INDEX idx_licencias_auth_user_id ON licencias(auth_user_id);
CREATE INDEX idx_licencias_estado ON licencias(estado);
CREATE INDEX idx_licencias_fecha_expiracion ON licencias(fecha_expiracion);
