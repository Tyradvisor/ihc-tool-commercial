// ============================================================
// license.js — Capa de licenciamiento IHC Tool™
// TyrAdvisor · v1.0 · Sprint 2
// ============================================================
(function () {

  // ── CONFIGURACIÓN ──────────────────────────────────────────
  const API_BASE       = 'https://ikdrnispjakjaxqwzhaf.supabase.co/functions/v1';
  const ANON_KEY       = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZHJuaXNwamFramF4cXd6aGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2ODYyNzUsImV4cCI6MjA5NTI2MjI3NX0.Chm-6IsdEF2Hc1D2JKWQLRs5-nPIVcGXUXla9LZnV9o';
  const STORAGE_TOKEN  = 'ihc_license_token';
  const STORAGE_FP     = 'ihc_device_fp';
  const HEARTBEAT_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

  // ── UTILIDADES ─────────────────────────────────────────────

  function parseJwt(token) {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch { return null; }
  }

  async function sha256hex(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function canvasFingerprint() {
    try {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('IHC🔑', 2, 15);
      return c.toDataURL().slice(-50);
    } catch { return 'no-canvas'; }
  }

  // ── FINGERPRINT ────────────────────────────────────────────

  async function generateFingerprint() {
    const cached = localStorage.getItem(STORAGE_FP);
    if (cached) return cached;
    const raw = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvasFingerprint()
    ].join('|');
    const fp = await sha256hex(raw);
    localStorage.setItem(STORAGE_FP, fp);
    return fp;
  }

  // ── CACHE DE TOKEN ─────────────────────────────────────────

  function cacheToken(token) {
    const payload = parseJwt(token);
    localStorage.setItem(STORAGE_TOKEN, JSON.stringify({
      token,
      payload,
      cached_at: Date.now()
    }));
  }

  function loadCachedToken() {
    try {
      const raw = localStorage.getItem(STORAGE_TOKEN);
      if (!raw) return null;
      const data = JSON.parse(raw);
      const payload = data.payload;
      if (!payload) return null;

      const nowMs = Date.now();
      const expMs = payload.exp * 1000;

      if (nowMs < expMs) {
        // Token vigente
        return { ...data, grace_offline: false };
      }

      // Token expirado — verificar ventana de gracia offline
      const diasOffline = payload.feature_flags?.dias_offline || 7;
      const limiteOffline = data.cached_at + diasOffline * 86400000;
      if (nowMs < limiteOffline) {
        return { ...data, grace_offline: true };
      }

      // Fuera de gracia
      localStorage.removeItem(STORAGE_TOKEN);
      return null;
    } catch {
      localStorage.removeItem(STORAGE_TOKEN);
      return null;
    }
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_TOKEN);
  }

  // ── LLAMADAS A LA API ──────────────────────────────────────

  async function callValidateLicense(email, password) {
    const fingerprint = await generateFingerprint();
    const res = await fetch(API_BASE + '/validate-license', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY
      },
      body: JSON.stringify({ email, password, fingerprint, user_agent: navigator.userAgent })
    });
    return res.json();
  }

  async function callHeartbeat(token) {
    const fingerprint = await generateFingerprint();
    try {
      const res = await fetch(API_BASE + '/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': ANON_KEY,
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ fingerprint })
      });
      return res.json();
    } catch {
      return { ok: false, offline: true };
    }
  }

  // ── UI: LOGIN OVERLAY ──────────────────────────────────────

  function renderLoginOverlay() {
    const div = document.createElement('div');
    div.id = 'ihc-login-overlay';
    div.innerHTML = `
      <style>
        #ihc-login-overlay {
          position: fixed; inset: 0; background: #0A1628;
          display: flex; align-items: center; justify-content: center;
          z-index: 9999; font-family: 'Segoe UI', system-ui, sans-serif;
        }
        .ihc-login-card {
          background: #fff; border-radius: 16px; padding: 40px 44px;
          width: 100%; max-width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }
        .ihc-login-logo {
          font-size: 22px; font-weight: 900; color: #0A1628; margin-bottom: 4px;
        }
        .ihc-login-logo span { color: #00B4D8; }
        .ihc-login-sub {
          font-size: 13px; color: #64748B; margin-bottom: 28px;
        }
        .ihc-login-label {
          display: block; font-size: 12px; font-weight: 600;
          color: #1E293B; margin-bottom: 6px;
        }
        .ihc-login-input {
          width: 100%; padding: 10px 14px; border: 1.5px solid #E2E8F0;
          border-radius: 8px; font-size: 14px; font-family: inherit;
          margin-bottom: 16px; outline: none; transition: border 0.15s;
          box-sizing: border-box;
        }
        .ihc-login-input:focus { border-color: #00B4D8; }
        .ihc-login-btn {
          width: 100%; padding: 12px; background: #00B4D8; color: #0A1628;
          border: none; border-radius: 8px; font-size: 15px; font-weight: 700;
          cursor: pointer; font-family: inherit; transition: opacity 0.15s;
          margin-top: 4px;
        }
        .ihc-login-btn:hover { opacity: 0.88; }
        .ihc-login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ihc-login-error {
          background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626;
          padding: 10px 14px; border-radius: 8px; font-size: 13px;
          margin-bottom: 16px; display: none;
        }
        .ihc-login-privacy {
          font-size: 11px; color: #94A3B8; text-align: center; margin-top: 18px;
          line-height: 1.5;
        }
        .ihc-login-privacy strong { color: #64748B; }
        .ihc-login-forgot {
          text-align: right; margin-top: -10px; margin-bottom: 18px;
        }
        .ihc-login-forgot a {
          font-size: 12px; color: #00B4D8; text-decoration: none;
        }
        .ihc-login-forgot a:hover { text-decoration: underline; }
      </style>
      <div class="ihc-login-card">
        <div class="ihc-login-logo">IHC <span>Tool™</span></div>
        <div class="ihc-login-sub">Inventory Health Check · TyrAdvisor</div>
        <div id="ihc-login-error" class="ihc-login-error"></div>
        <label class="ihc-login-label">Email</label>
        <input id="ihc-email" type="email" class="ihc-login-input" placeholder="tu@empresa.cl" autocomplete="email" />
        <label class="ihc-login-label">Contraseña</label>
        <input id="ihc-password" type="password" class="ihc-login-input" placeholder="••••••••" autocomplete="current-password" />
        <div class="ihc-login-forgot">
          <a href="mailto:mauricio@tyradvisor.com?subject=Recuperar%20contraseña%20IHC%20Tool">¿Olvidé mi contraseña?</a>
        </div>
        <button id="ihc-login-btn" class="ihc-login-btn">Iniciar sesión</button>
        <p class="ihc-login-privacy">
          🔒 <strong>Tus datos nunca salen de tu computador.</strong><br>
          Solo tu licencia se verifica en línea.
        </p>
      </div>
    `;
    document.body.appendChild(div);

    // Enter key en password
    document.getElementById('ihc-password').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('ihc-login-btn').click();
    });

    document.getElementById('ihc-login-btn').addEventListener('click', async () => {
      const email    = document.getElementById('ihc-email').value.trim();
      const password = document.getElementById('ihc-password').value;
      const errEl    = document.getElementById('ihc-login-error');
      const btn      = document.getElementById('ihc-login-btn');

      errEl.style.display = 'none';

      if (!email || !password) {
        errEl.textContent = 'Ingresa tu email y contraseña.';
        errEl.style.display = 'block';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Verificando…';

      try {
        const result = await callValidateLicense(email, password);
        if (result.ok) {
          cacheToken(result.token);
          hideLoginOverlay();
          bootApp(parseJwt(result.token));
        } else {
          const msgs = {
            INVALID_CREDENTIALS: 'Email o contraseña incorrectos.',
            LICENSE_EXPIRED:     'Tu licencia venció. Contáctanos para renovar.',
            LICENSE_SUSPENDED:   'Tu licencia está suspendida. Contacta a TyrAdvisor.',
            LICENSE_REVOKED:     'Tu licencia fue revocada. Contacta a TyrAdvisor.',
            DEVICE_LIMIT_REACHED: result.message || 'Límite de dispositivos alcanzado. Libera uno desde Mi Cuenta.',
            RATE_LIMITED:        'Demasiados intentos. Espera unos minutos.',
          };
          errEl.textContent = msgs[result.code] || result.message || 'Error al iniciar sesión.';
          errEl.style.display = 'block';
        }
      } catch {
        errEl.textContent = 'Sin conexión a internet. Verifica tu red.';
        errEl.style.display = 'block';
      }

      btn.disabled = false;
      btn.textContent = 'Iniciar sesión';
    });
  }

  function hideLoginOverlay() {
    const el = document.getElementById('ihc-login-overlay');
    if (el) el.remove();
  }

  // ── UI: TOPBAR DE LICENCIA ─────────────────────────────────

  function renderLicenseBadge(payload, graceOffline) {
    const existing = document.getElementById('ihc-license-badge');
    if (existing) existing.remove();

    const tbRight = document.querySelector('.tb-right');
    if (!tbRight) return;

    const exp = new Date(payload.exp * 1000);
    const daysLeft = Math.ceil((exp - Date.now()) / 86400000);
    const plan = (payload.plan || 'starter').charAt(0).toUpperCase() + payload.plan.slice(1);

    let badgeColor = '#10B981'; // verde
    let badgeText  = `${plan} · vence ${exp.toLocaleDateString('es-CL', { day:'2-digit', month:'short', year:'numeric' })}`;

    if (graceOffline) {
      badgeColor = '#F59E0B';
      badgeText  = `${plan} · Sin conexión`;
    } else if (daysLeft <= 30) {
      badgeColor = '#F59E0B';
      badgeText  = `${plan} · Vence en ${daysLeft}d ⚠`;
    }

    const badge = document.createElement('div');
    badge.id = 'ihc-license-badge';
    badge.style.cssText = `
      font-size: 11px; padding: 4px 10px; border-radius: 6px;
      background: ${badgeColor}22; color: ${badgeColor};
      border: 1px solid ${badgeColor}55; white-space: nowrap; font-weight: 600;
    `;
    badge.textContent = badgeText;

    // Botón Mi Cuenta
    const btnCuenta = document.createElement('button');
    btnCuenta.id = 'ihc-btn-cuenta';
    btnCuenta.className = 'tb-btn';
    btnCuenta.textContent = 'Mi Cuenta';
    btnCuenta.onclick = () => showMiCuenta(payload);

    tbRight.prepend(btnCuenta);
    tbRight.prepend(badge);
  }

  // ── UI: MI CUENTA ──────────────────────────────────────────

  function showMiCuenta(payload) {
    let modal = document.getElementById('ihc-modal-cuenta');
    if (modal) { modal.style.display = 'flex'; return; }

    modal = document.createElement('div');
    modal.id = 'ihc-modal-cuenta';
    const plan = (payload.plan || 'starter').charAt(0).toUpperCase() + payload.plan.slice(1);
    const exp  = new Date(payload.exp * 1000).toLocaleDateString('es-CL', { day:'2-digit', month:'long', year:'numeric' });
    const ff   = payload.feature_flags || {};

    modal.innerHTML = `
      <style>
        #ihc-modal-cuenta {
          position: fixed; inset: 0; background: rgba(10,22,40,0.7);
          display: flex; align-items: center; justify-content: center; z-index: 9998;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }
        .ihc-modal-box {
          background: #fff; border-radius: 14px; padding: 32px 36px;
          max-width: 480px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .ihc-modal-title { font-size: 18px; font-weight: 800; color: #0A1628; margin-bottom: 20px; }
        .ihc-modal-row { display: flex; justify-content: space-between; padding: 8px 0;
          border-bottom: 1px solid #F1F5F9; font-size: 13px; }
        .ihc-modal-key { color: #64748B; }
        .ihc-modal-val { font-weight: 600; color: #1E293B; }
        .ihc-modal-actions { margin-top: 24px; display: flex; gap: 10px; justify-content: flex-end; }
        .ihc-btn-logout {
          background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA;
          padding: 8px 18px; border-radius: 8px; font-size: 13px; cursor: pointer;
          font-family: inherit; font-weight: 600;
        }
        .ihc-btn-close {
          background: #F1F5F9; color: #1E293B; border: 1px solid #E2E8F0;
          padding: 8px 18px; border-radius: 8px; font-size: 13px; cursor: pointer;
          font-family: inherit; font-weight: 600;
        }
      </style>
      <div class="ihc-modal-box">
        <div class="ihc-modal-title">Mi Cuenta</div>
        <div class="ihc-modal-row"><span class="ihc-modal-key">Plan</span><span class="ihc-modal-val">${plan}</span></div>
        <div class="ihc-modal-row"><span class="ihc-modal-key">Vencimiento</span><span class="ihc-modal-val">${exp}</span></div>
        <div class="ihc-modal-row"><span class="ihc-modal-key">Máx. SKUs</span><span class="ihc-modal-val">${payload.max_skus === -1 ? 'Ilimitado' : payload.max_skus?.toLocaleString('es-CL')}</span></div>
        <div class="ihc-modal-row"><span class="ihc-modal-key">Exportar Excel</span><span class="ihc-modal-val">${ff.export_xlsx ? '✅ Incluido' : '❌ No incluido'}</span></div>
        <div class="ihc-modal-row"><span class="ihc-modal-key">Causas Raíz</span><span class="ihc-modal-val">${ff.causas_raiz ? '✅ Incluido' : '❌ No incluido'}</span></div>
        <div class="ihc-modal-row"><span class="ihc-modal-key">Soporte</span><span class="ihc-modal-val"><a href="mailto:mauricio@tyradvisor.com" style="color:#00B4D8">mauricio@tyradvisor.com</a></span></div>
        <div class="ihc-modal-actions">
          <button class="ihc-btn-close" onclick="document.getElementById('ihc-modal-cuenta').style.display='none'">Cerrar</button>
          <button class="ihc-btn-logout" id="ihc-logout-btn">Cerrar sesión</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('ihc-logout-btn').addEventListener('click', () => {
      clearSession();
      location.reload();
    });
  }

  // ── FEATURE GATING ─────────────────────────────────────────

  function applyFeatureGating(payload) {
    const ff      = payload.feature_flags || {};
    const maxSkus = payload.max_skus;

    // Ocultar pestañas premium si el plan no las incluye
    const tabMap = {
      'causas_raiz': '#causas',
      'madurez':     '#madurez',
    };

    document.querySelectorAll('.subnav a').forEach(a => {
      const href = a.getAttribute('href');
      if (href === '#causas' && !ff.causas_raiz) {
        a.style.opacity = '0.4';
        a.title = 'Disponible en plan Pro y Enterprise';
        a.onclick = (e) => {
          e.preventDefault();
          alert('Esta función está disponible en el plan Pro y Enterprise.\nContacta a TyrAdvisor para hacer upgrade.');
        };
      }
      if (href === '#madurez' && !ff.madurez) {
        a.style.opacity = '0.4';
        a.title = 'Disponible en plan Pro y Enterprise';
        a.onclick = (e) => {
          e.preventDefault();
          alert('Esta función está disponible en el plan Pro y Enterprise.\nContacta a TyrAdvisor para hacer upgrade.');
        };
      }
    });

    // Ocultar botón Excel si plan no lo incluye
    if (!ff.export_xlsx) {
      document.querySelectorAll('.tb-btn').forEach(btn => {
        if (btn.textContent.includes('Excel') || btn.textContent.includes('xlsx')) {
          btn.style.display = 'none';
        }
      });
    }

    // Límite de SKUs — se aplica en parseFile via window.ihcLicense.getMaxSkus()
    window._ihcMaxSkus = maxSkus;
  }

  // ── API PÚBLICA ────────────────────────────────────────────

  window.ihcLicense = {
    isFeatureEnabled(feature) {
      const t = loadCachedToken();
      return t ? !!(t.payload?.feature_flags?.[feature]) : false;
    },
    getMaxSkus() {
      const t = loadCachedToken();
      return t ? (t.payload?.max_skus ?? 0) : 0;
    },
    getPlan() {
      const t = loadCachedToken();
      return t ? t.payload?.plan : null;
    },
    getState() {
      const t = loadCachedToken();
      if (!t) return 'NO_LICENSE';
      if (t.grace_offline) return 'OFFLINE_GRACE';
      return 'OK';
    },
    logout() {
      clearSession();
      location.reload();
    }
  };

  // ── BOOT DE LA APP ─────────────────────────────────────────

  function bootApp(payload) {
    applyFeatureGating(payload);
    renderLicenseBadge(payload, false);
    // La app original arranca desde aquí — showScreen('upload') en app.html
    if (typeof window._ihcOriginalBoot === 'function') {
      window._ihcOriginalBoot();
    }
  }

  // ── HEARTBEAT EN BACKGROUND ────────────────────────────────

  async function maybeRunHeartbeat(cachedData) {
    const shouldRun = (Date.now() - cachedData.cached_at) > HEARTBEAT_INTERVAL_MS;
    if (!shouldRun) return;

    const result = await callHeartbeat(cachedData.token);
    if (result.ok && result.token) {
      cacheToken(result.token);
    } else if (result.code === 'LICENSE_REVOKED' || result.code === 'LICENSE_SUSPENDED') {
      clearSession();
      location.reload();
    }
    // Si offline: silencioso, continúa con token actual
  }

  // ── INICIALIZACIÓN ─────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', async () => {
    const cached = loadCachedToken();

    if (cached) {
      // Token en cache: arrancar app directo
      bootApp(cached.payload);
      renderLicenseBadge(cached.payload, cached.grace_offline);
      // Heartbeat silencioso en background
      maybeRunHeartbeat(cached);
    } else {
      // Sin token: mostrar login
      renderLoginOverlay();
    }
  });

})();
