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

## ⚙️ Configuración Local

### Requisitos
- Node.js 18+
- Python 3.11+ (solo para admin panel)
- Cuenta Supabase
- Cuenta Resend.com

### Pasos de Configuración

1. **Clona el repositorio**
   ```bash
   git clone https://github.com/TyrAdvisor/ihc-tool-commercial.git
   cd ihc-tool-commercial
   ```

2. **Crea tu archivo `.env`**
   ```bash
   cp .env.example .env
   ```

3. **Obtén tus credenciales**

   - **Supabase**: Dashboard → Settings → API
     - Copia `SUPABASE_URL`
     - Copia `SUPABASE_ANON_KEY`
     - Copia `SUPABASE_SERVICE_ROLE_KEY`
     - Copia `JWT_SECRET`

   - **Resend**: Dashboard → API Keys
     - Copia `RESEND_API_KEY`

   - **Sentry** (opcional): Settings → Client Keys
     - Copia `SENTRY_DSN_FRONTEND`
     - Copia `SENTRY_DSN_BACKEND`

4. **Completa el archivo `.env`**
   ```bash
   # Edita .env con tus credenciales reales
   nano .env  # o usa tu editor favorito
   ```

5. **Instala dependencias**
   ```bash
   # Frontend
   npm install

   # Admin panel (si lo necesitas)
   cd admin-panel
   pip install -r requirements.txt
   ```

6. **Inicia el desarrollo**
   ```bash
   # Frontend en http://localhost:5173
   npm run dev

   # Admin panel en http://localhost:8501 (otra terminal)
   cd admin-panel
   streamlit run app.py
   ```

### ⚠️ Seguridad

- **Nunca** commitees tu `.env` → está en `.gitignore`
- **Nunca** compartas `.env` por email, Slack, o chat
- **Nunca** subas archivos `.env` a repositorios públicos
- Cada ambiente (local, staging, prod) tiene su propio `.env`
- Credenciales en producción van en dashboards seguros (Render, Supabase)

### Variables de Entorno por Servicio

Para producción, almacena credenciales directamente en cada plataforma:

**Render (Admin Panel)**
```
Environment Variables:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- JWT_SECRET
- RESEND_API_KEY
```

**GitHub (CI/CD)**
```
Settings → Secrets and variables:
- STREAMLIT_CLOUD_TOKEN (para despliegue automático)
```

---

## Sprint actual: Sprint 0 — Setup infra
