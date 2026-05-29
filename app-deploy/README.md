# IHC Tool™ — Client app deploy

Static deploy of the **client-facing tool** (what licensed clients use to
analyze their inventory). This is **separate** from `/landing/` because the
two have different audiences, different cache needs and different CSP needs.

## Layout

```
app-deploy/
├── index.html               (copy of repo's app.html, renamed for clean URLs)
├── client/
│   └── license.min.js       (license + auth + Mi Cuenta UI)
├── netlify.toml             security headers + cache strategy
└── README.md                this file
```

## Source of truth

The canonical sources live at the repo root:
- `app.html` (mirrored here as `index.html` for `/` to work without a trailing path)
- `client/license.min.js`

**When you change `app.html` or `client/license.min.js`, you must also copy
the new versions into this folder before pushing**, otherwise the live client
will keep running the old code. See "Sync script" below.

## Sync script (manual for now)

From the repo root:

```powershell
# PowerShell
Copy-Item -Force app.html app-deploy\index.html
Copy-Item -Force client\license.min.js app-deploy\client\license.min.js
```

```bash
# Bash / git-bash
cp -f app.html app-deploy/index.html
cp -f client/license.min.js app-deploy/client/license.min.js
```

You can wrap this in `package.json` later (`npm run sync-client-app`) or
move to a build step that copies on each push.

## Deploy in Netlify (one time setup)

This is a **second site** in the same Netlify workspace, separate from the
landing.

1. Netlify dashboard → **Add new site → Import an existing project**
2. Select the same repo `Tyradvisor/ihc-tool-commercial`
3. Branch: `main`
4. **Base directory**: `app-deploy`
5. **Build command**: (empty)
6. **Publish directory**: `.`
7. Deploy

Netlify will assign a `https://*.netlify.app` URL. Rename in **Site
configuration → Change site name** to something like `ihc-tool-app` so the
URL becomes `https://ihc-tool-app.netlify.app`.

## Custom domain

Eventually the canonical URL should be `https://app.tyradvisor.com`. To get
there:

1. In the second Netlify site → **Domain settings → Add custom domain**
2. Enter `app.tyradvisor.com`
3. Netlify will tell you to add a `CNAME` record in your `tyradvisor.com`
   DNS pointing `app` → `ihc-tool-app.netlify.app`
4. Add the record at your DNS provider (Cloudflare, GoDaddy, etc.)
5. Once DNS propagates (5 min – 1 h), Netlify provisions a Let's Encrypt
   cert automatically.

## What clients see

When a licensed client visits `https://app.tyradvisor.com/`:

1. `index.html` loads
2. `client/license.min.js` runs immediately
3. If there is a cached valid license token in `localStorage` → app boots
4. Otherwise → login overlay appears, client enters email + password
5. On success → `validate-license` Edge Function returns a fresh token,
   `license.min.js` caches it and boots the app
6. Heartbeat runs in background every 7 days

No data leaves the browser at any point — only the license verification
goes to our backend.
