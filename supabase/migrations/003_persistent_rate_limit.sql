-- 003_persistent_rate_limit.sql
-- Persistent rate limit table for validate-license Edge Function.
-- Replaces the in-memory Map in the function which got reset on every
-- cold start (a ~1-2 min wait was enough to evade the 5/5min limit).
--
-- Created: 2026-05-28

CREATE TABLE IF NOT EXISTS intentos_login (
  id BIGSERIAL PRIMARY KEY,
  ip TEXT NOT NULL,
  email TEXT,                      -- optional: helps audit/per-account lockout later
  intentado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  exitoso BOOLEAN NOT NULL DEFAULT false
);

-- Lookup index: "how many failed attempts from this IP in the last N minutes?"
CREATE INDEX IF NOT EXISTS idx_intentos_login_ip_time
  ON intentos_login (ip, intentado_at DESC);

-- RLS: only service_role can read/write. Anon and authenticated have no access.
ALTER TABLE intentos_login ENABLE ROW LEVEL SECURITY;
-- (No policies created -> with RLS on and no policies, only service_role bypasses.)

-- Optional housekeeping: drop attempts older than 1 day to keep the table small.
-- Run manually or via pg_cron if you want it scheduled.
-- DELETE FROM intentos_login WHERE intentado_at < now() - interval '1 day';
