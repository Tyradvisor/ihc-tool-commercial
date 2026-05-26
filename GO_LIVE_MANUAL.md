# IHC Tool™ Comercial — Go-Live Manual

**Status**: Ready for Production Deployment  
**Version**: 1.0  
**Date**: 2026-05-26  
**Audience**: DevOps, Infrastructure, IT Leadership

---

## Executive Summary

IHC Tool™ Comercial has completed a comprehensive security audit and architectural hardening. This manual provides step-by-step instructions for deploying to production on Render with Supabase backend.

**Security Status**: ✅ ALL 9 CRITICAL ISSUES RESOLVED
- Application boot security: Fixed
- Terms & Conditions enforcement: Fixed
- License validation & SKU limits: Fixed
- Date parsing & timezone handling: Fixed
- Calculation determinism: Fixed
- Edge Functions authorization: Fixed
- Database security & RLS: Complete

---

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│   Frontend (app.html)                   │
│   - Client-side only (private data)     │
│   - License verification via edge       │
│   - Offline grace period support        │
└──────────────┬──────────────────────────┘
               │ HTTPS
               ▼
┌─────────────────────────────────────────┐
│   Supabase Edge Functions               │
│   - validate-license                    │
│   - heartbeat (renewal)                 │
│   - send-email (admin-only)             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   Supabase PostgreSQL                   │
│   - RLS policies enforce access         │
│   - Plans, Licenses, Activations, Audit │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│   Admin Panel (Streamlit on Render)     │
│   - User management                     │
│   - License administration              │
│   - Email templates & sending           │
└──────────────┬──────────────────────────┘
               │
               ▼
        [Supabase Auth]
```

---

## Pre-Deployment Checklist

### 1. Supabase Project Setup

#### 1.1 Create/Verify Supabase Project
```bash
# If new project:
npx supabase projects create \
  --name "ihc-tool-comercial" \
  --db-password "<SECURE_PASSWORD>" \
  --region "sa-east-1"  # São Paulo (closest to Chile)

# Get project URL and keys
supabase status --project-ref <your-project-ref>
```

#### 1.2 Configure Environment Variables
```bash
# In Supabase dashboard:
# Settings → API → Copy these values

# .env.local (frontend)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...  # (from app.html line 7)

# Render environment variables:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # ⚠️ SECURE - Never in version control
JWT_SECRET=your-jwt-secret-key  # ⚠️ SECURE
RESEND_API_KEY=re_...  # From Resend.com account
```

### 2. Database Migrations

#### 2.1 Apply Migrations
```bash
# Clone the repository
git clone https://github.com/TyrAdvisor/ihc-tool-commercial.git
cd ihc-tool-commercial

# Login to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Apply migrations
supabase db push

# Verify
supabase db pull  # Should show schema
```

#### 2.2 Verify Tables Created
```sql
-- Run in Supabase SQL Editor

-- Should return 6 tables
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public';

-- Expected: clientes, planes, licencias, activaciones, 
--           eventos_licencia, user_roles

-- Check seed data (should have 3 plans)
SELECT nombre FROM planes;
-- Expected: starter, pro, enterprise
```

#### 2.3 Create Admin User
```sql
-- In Supabase SQL Editor, after auth.users exists

-- Get your user ID from Supabase Auth dashboard
-- Then run:

INSERT INTO user_roles (user_id, role) 
VALUES ('<your-auth-user-id>', 'admin');

-- Verify
SELECT * FROM user_roles WHERE role = 'admin';
```

### 3. Supabase Edge Functions

#### 3.1 Deploy Functions
```bash
# Deploy validate-license function
supabase functions deploy validate-license \
  --project-ref <your-project-ref>

# Deploy heartbeat function
supabase functions deploy heartbeat \
  --project-ref <your-project-ref>

# Deploy send-email function
supabase functions deploy send-email \
  --project-ref <your-project-ref>

# Verify deployment
supabase functions list --project-ref <your-project-ref>
```

#### 3.2 Test Edge Functions
```bash
# Get your anon key from Supabase dashboard

# Test validate-license (will fail - no user exists yet)
curl -X POST https://your-project.supabase.co/functions/v1/validate-license \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "fingerprint": "test-fingerprint-hash",
    "user_agent": "Mozilla/5.0"
  }'
# Expected: 401 INVALID_CREDENTIALS or 403 NO_LICENSE (not 500 error)

# Test heartbeat (will fail - no token, but verifies endpoint exists)
curl -X POST https://your-project.supabase.co/functions/v1/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"fingerprint": "test"}'
# Expected: 401 NO_TOKEN (not 500 error)
```

### 4. Render Deployment

#### 4.1 Deploy Admin Panel
```bash
# Push Dockerfile to repository
git add admin-panel/Dockerfile
git commit -m "build: add Dockerfile for Render deployment"
git push origin fix/security-license-go-live

# In Render dashboard:
# 1. Create new Web Service
# 2. Connect GitHub repository: TyrAdvisor/ihc-tool-commercial
# 3. Branch: fix/security-license-go-live
# 4. Runtime: Docker
# 5. Build command: (automatic, reads Dockerfile)
# 6. Start command: (automatic, from Dockerfile)
# 7. Environment: Add all SUPABASE_* and JWT_SECRET variables
# 8. Deploy

# Monitor logs in Render dashboard
# Should see: "Collecting usage statistics" → "Generating client library" → Running on http://0.0.0.0:8501
```

#### 4.2 Verify Admin Panel
```bash
# After deployment, access:
# https://ihc-tool-comercial-admin.render.com

# Should show:
# - Streamlit login screen
# - No errors in browser console
# - Database connection working (can see admin panel without Supabase login required)
```

### 5. Frontend Hosting

#### 5.1 Deploy Frontend
```bash
# Option A: Netlify (Recommended)
# 1. Connect GitHub repo to Netlify
# 2. Build command: (none - app.html is static)
# 3. Publish directory: ./  (root, app.html is there)
# 4. Add environment variables (though not used client-side)
# 5. Deploy

# Option B: Render Static Site
# 1. In Render dashboard: New Static Site
# 2. Connect GitHub repo
# 3. Branch: fix/security-license-go-live
# 4. Build command: (none)
# 5. Publish directory: ./
# 6. Deploy

# Option C: Custom CDN
# - Upload dist/ files to S3 + CloudFront
# - Enable HTTPS only
# - Configure CORS headers

# Verify app.html loads:
curl https://your-domain.com/app.html | grep -c "IHC Tool"
# Should return: 1 (page contains IHC Tool text)
```

### 6. SSL/TLS & Security Headers

#### 6.1 SSL Certificates
```bash
# Render and Netlify provide free SSL automatically
# Verify certificate:
openssl s_client -connect your-domain.com:443 -tls1_2 2>/dev/null | grep -A 2 "subject="

# Should show: CN=*.your-domain.com (or exact domain)
```

#### 6.2 Security Headers
```bash
# Add to web server config (if self-hosted):

# HSTS (force HTTPS)
Strict-Transport-Security: max-age=31536000; includeSubDomains

# Content Security Policy (prevent XSS)
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://your-project.supabase.co

# X-Frame-Options (prevent clickjacking)
X-Frame-Options: DENY

# X-Content-Type-Options (prevent MIME sniffing)
X-Content-Type-Options: nosniff

# For Netlify: Create netlify.toml
```

---

## Production Verification

### 1. Application Boot

```bash
# Test in browser DevTools console:

# Clear cache
localStorage.clear()

# Reload
location.reload()

# Verify login overlay appears (not app with no license)
# Check: document.getElementById('ihc-login-overlay') should exist
```

### 2. License Verification

```bash
# Create test license in Supabase:

-- 1. Create client
INSERT INTO clientes (razon_social, email_contacto) 
VALUES ('Test Company', 'test@example.com');

-- 2. Get client_id
SELECT id FROM clientes WHERE razon_social = 'Test Company';

-- 3. Create user in Supabase Auth (UI or API)
-- Get the auth user ID

-- 4. Create license
INSERT INTO licencias (
  cliente_id, plan_id, auth_user_id, 
  fecha_inicio, fecha_expiracion, estado
) VALUES (
  '<client_id>',
  (SELECT id FROM planes WHERE nombre = 'starter'),
  '<auth_user_id>',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 year',
  'activa'
);

-- 5. Login via app.html with these credentials
# Should succeed and show dashboard
```

### 3. Feature Gating

```bash
# In browser DevTools console (after login):

// Check Starter plan
window.ihcLicense.isFeatureEnabled('causas_raiz')  // Should be false
window.ihcLicense.getMaxSkus()                     // Should be 1000
window.ihcLicense.getPlan()                        // Should be 'starter'

// Change to Pro plan in database, logout & login
// window.ihcLicense.isFeatureEnabled('causas_raiz')  // Should be true
```

### 4. Offline Mode

```bash
# 1. Login successfully
# 2. Open DevTools > Network > Throttle to Offline
# 3. App should continue working
# 4. Badge should show "Sin conexión" in yellow
# 5. Logout should show error (no network)
# 6. Close browser, wait 8+ days, offline mode should fail
```

### 5. Admin Functions

```bash
# Test send-email function (manual):

curl -X POST https://your-project.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer $ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "bienvenida",
    "to_email": "user@example.com",
    "to_name": "Test User",
    "data": {
      "plan": "Starter",
      "email": "user@example.com",
      "password_temporal": "TempPass123!",
      "max_skus": 1000,
      "max_dispositivos": 1,
      "fecha_expiracion": "2027-05-26"
    }
  }'

# Expected response: { "ok": true, "id": "email-id" }
# Check Resend.com inbox for email
```

---

## Monitoring & Maintenance

### 1. Health Checks

```bash
# Daily: Check if services are up

# Frontend
curl -s -o /dev/null -w "%{http_code}" https://your-domain.com/app.html
# Should return: 200

# Supabase Edge Functions
curl -X POST https://your-project.supabase.co/functions/v1/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"fingerprint": "test"}' | grep -c "NO_TOKEN"
# Should return: 1 (error exists, function is up)

# Admin Panel
curl -s -o /dev/null -w "%{http_code}" https://ihc-tool-comercial-admin.render.com
# Should return: 200 or 401 (auth required, but server is up)
```

### 2. Database Backups

```bash
# Supabase provides automatic backups (paid plans)
# Manual backup (Supabase dashboard):
# 1. Go to Database > Backups
# 2. Click "Backup now"
# 3. Schedule daily backups

# Restore from backup:
# 1. Backups > select backup date
# 2. Click "Restore"
# 3. Wait ~10 minutes for restore to complete
```

### 3. Log Monitoring

```bash
# Render logs
# In Render dashboard: Logs tab
# Monitor for:
# - Port errors (should run on 8501)
# - Database connection errors
# - Missing environment variables

# Supabase Edge Function logs
# In Supabase dashboard: Functions > select function
# Monitor for:
# - Authentication errors
# - Database errors
# - Rate limit hits

# Frontend errors (if tracking enabled)
# Use Sentry.io or similar for client-side error tracking
```

### 4. License Renewal Automation

```bash
# Manual: Email customers at 30/15/0 days before expiration
# Use send-email function with admin token

# Automatic (future): Create Supabase scheduled function
# - Runs daily at 00:00 UTC
# - Finds licenses expiring in 30/15/0 days
# - Sends email via send-email function
```

---

## Troubleshooting

### Issue: "Token requerido" on app.html
**Cause**: App loaded before license.js  
**Fix**: Ensure app.html loads AFTER <script src="client/license.min.js"></script>

### Issue: License expiration off by 1 day
**Cause**: UTC/timezone mismatch  
**Fix**: Verify parseDate() uses local timezone (already fixed in code)

### Issue: Edge function returns 500 error
**Cause**: Missing environment variable  
**Fix**: Check JWT_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in Render env vars

### Issue: Supabase connection timeout
**Cause**: Network/firewall issue  
**Fix**: 
```bash
# Test connection
psql -h your-project.supabase.co -U postgres -d postgres
# Enter password from Supabase dashboard
# Should connect successfully
```

### Issue: RLS policy blocking legitimate queries
**Cause**: User not in correct role table  
**Fix**: Verify user_roles entry exists for the auth user

---

## Rollback Procedure

If critical issue discovered post-deployment:

```bash
# 1. Revert to previous stable commit
git checkout main  # or previous tag

# 2. Redeploy frontend
# (Netlify/Render will auto-redeploy on branch change)

# 3. Redeploy Edge Functions
supabase functions deploy validate-license --project-ref <ref>
supabase functions deploy heartbeat --project-ref <ref>
supabase functions deploy send-email --project-ref <ref>

# 4. DO NOT revert database (data loss risk)
# Instead: Write migration to fix schema issues

# 5. Notify users of incident
# Email: contacto@tyradvisor.com
```

---

## Post-Launch Tasks

### 1. Week 1: Stability
- Monitor error logs hourly
- Verify licenses activating correctly
- Test heartbeat renewal (may need to wait or manipulate timestamps)
- Confirm offline mode working

### 2. Week 2: Scale Testing
- Load test with 10x expected users
- Verify database performance
- Check rate limiting effectiveness
- Monitor Supabase quota usage

### 3. Week 3: Feature Verification
- Test all feature gates across plan types
- Verify audit logs recording events
- Check email templates rendering
- Confirm admin panel functionality

### 4. Week 4: Optimization
- Analyze slow requests
- Optimize database indexes if needed
- Compress assets further if needed
- Plan for auto-scaling strategy

---

## Support Contacts

**Technical Issues**: engineering@tyradvisor.com  
**Customer Escalations**: contacto@tyradvisor.com  
**Billing/License**: mauricio@tyradvisor.com  
**On-Call**: [On-call schedule to be added]

---

**Version**: 1.0  
**Last Updated**: 2026-05-26  
**Next Review**: 2026-06-26
