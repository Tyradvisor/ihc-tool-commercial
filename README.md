# IHC Tool™ Comercial

Sistema de licenciamiento SaaS para IHC Tool™ — TyrAdvisor.

**Principio rector:** los datos de inventario del cliente nunca salen de su navegador.
Solo licencias e identidad viven en la nube.

## Stack
- Cliente: HTML + JS (app.html + license.js)
- Backend: Supabase (Postgres + Edge Functions Deno/TS) — región São Paulo
- Admin: Streamlit en Render
- Email: Resend

## Estructura
\`\`\`
supabase/          Edge Functions + migraciones SQL
client/            app.html + license.js
admin-panel/       Streamlit
email-templates/   6 templates HTML
docs/              Arquitectura, PRD, backlog
\`\`\`

## Sprint actual: Sprint 0 — Setup infra
