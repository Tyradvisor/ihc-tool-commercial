# Supabase migrations

This directory contains the SQL migrations for the IHC Tool™ database.

## ⚠️ Drift notice

Migrations `001_initial_schema.sql` and (the original) `002_rls_policies.sql`
were the *initial* design, but the schema in the live Supabase project evolved
in the dashboard during early development before being version-controlled
again. As a result, **`001_initial_schema.sql` does not match the live tables
exactly** in a few places.

Key differences (production wins — that's the source of truth):

| Table | What 001 says | What production has |
|-------|---------------|---------------------|
| `clientes` | `email_contacto`, `telefono`, `direccion`, `ciudad` | `contacto_email`, `contacto_nombre`, `contacto_telefono`, `industria`, `notas` |
| `licencias` | `auth_user_id TEXT`, no pricing fields | `auth_user_id UUID`, plus `precio_pagado_clp`, `factura_numero`, `notas_internas` |
| `user_roles` | column `role`, CHECK `('admin','user')` | column `rol`, CHECK `('admin','cliente')` |
| `user_roles.user_id` | `TEXT` | `uuid` |

`002_rls_policies.sql` was **rewritten on 2026-05-28** during security audit
ticket #18 to match the live policies exactly. It is the source of truth for
RLS going forward.

`003_persistent_rate_limit.sql` was added on 2026-05-28 as part of security
audit #14 and IS aligned with production.

## Implication for replays

Replaying these migrations from scratch on a fresh database **will not** produce
an environment identical to current production. You would need to:

1. Apply 001 as a starting point.
2. Manually adjust `clientes`, `licencias`, `user_roles` schemas to match production.
3. Apply the rewritten 002 (uses `rol`, `cliente`, `es_admin()`).
4. Apply 003 (intentos_login).

If we ever spin up a staging environment, we should write a `004_consolidate.sql`
that bridges 001 → current production state, or `pg_dump` the live schema and
treat that dump as the canonical baseline.

## Naming convention

`NNN_short_kebab_case.sql`, where `NNN` is a zero-padded sequence (`001`, `002`, …).
Never edit a migration once it's been applied to production — write a new one.

(The 2026-05-28 rewrite of `002` is the explicit exception, documented above,
done because the live state had diverged before there was strict discipline.)
