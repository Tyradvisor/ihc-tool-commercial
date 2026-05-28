// supabase/functions/validate-license/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit policy: max 5 failed attempts per IP in a 5-minute window.
// We persist attempts in the intentos_login table so the limit survives
// cold starts (the previous in-memory Map was wiped every ~1-2 min).
const RATE_LIMIT_WINDOW_MIN = 5;
const RATE_LIMIT_MAX_ATTEMPTS = 5;

async function checkRateLimit(
  supabaseAdmin: ReturnType<typeof createClient>,
  ip: string,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000).toISOString();

  const { count, error } = await supabaseAdmin
    .from("intentos_login")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .eq("exitoso", false)
    .gte("intentado_at", windowStart);

  if (error) {
    // Fail-open: if the rate limit table is unreachable we let the request
    // through rather than locking out legitimate users. The Edge Function
    // itself logs the error, so we still notice if this breaks.
    console.error("rate limit check failed:", error);
    return true;
  }

  return (count ?? 0) < RATE_LIMIT_MAX_ATTEMPTS;
}

async function logLoginAttempt(
  supabaseAdmin: ReturnType<typeof createClient>,
  ip: string,
  email: string | null,
  exitoso: boolean,
): Promise<void> {
  try {
    await supabaseAdmin.from("intentos_login").insert({ ip, email, exitoso });
  } catch (e) {
    // Logging failures shouldn't break the auth flow.
    console.error("logLoginAttempt failed:", e);
  }
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get("x-forwarded-for") ?? "unknown";

    // Cliente Supabase con service role (acceso total). Lo creamos antes
    // del rate limit check porque ese check también consulta la BD.
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Rate limiting persistente por IP (sobrevive cold starts).
    if (!(await checkRateLimit(supabaseAdmin, clientIp))) {
      return new Response(
        JSON.stringify({ ok: false, code: "RATE_LIMITED", message: "Demasiados intentos. Espera 5 minutos." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, password, fingerprint, user_agent } = await req.json();

    if (!email || !password || !fingerprint) {
      return new Response(
        JSON.stringify({ ok: false, code: "MISSING_FIELDS", message: "Faltan campos requeridos." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Autenticar con Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      // Registrar intento fallido — afecta el rate limit y queda en auditoría.
      await logLoginAttempt(supabaseAdmin, clientIp, email, false);
      await supabaseAdmin.from("eventos_licencia").insert({
        tipo: "login_falla",
        detalle: { email, motivo: "credenciales_invalidas" },
        ip: clientIp,
      });
      return new Response(
        JSON.stringify({ ok: false, code: "INVALID_CREDENTIALS", message: "Email o contraseña incorrectos." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authUserId = authData.user.id;

    // 2. Obtener licencia activa del usuario
    const { data: licencia, error: licError } = await supabaseAdmin
      .from("licencias")
      .select(`
        id, estado, fecha_inicio, fecha_expiracion, plan_id, cliente_id,
        planes (
          nombre, max_dispositivos, max_skus, dias_offline, feature_flags
        ),
        clientes (
          razon_social
        )
      `)
      .eq("auth_user_id", authUserId)
      .single();

    if (licError || !licencia) {
      return new Response(
        JSON.stringify({ ok: false, code: "NO_LICENSE", message: "No se encontró licencia para este usuario." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Verificar estado de la licencia
    const hoy = new Date().toISOString().split("T")[0];

    if (licencia.estado === "suspendida") {
      return new Response(
        JSON.stringify({ ok: false, code: "LICENSE_SUSPENDED", message: "Tu licencia está suspendida temporalmente. Contacta a TyrAdvisor." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (licencia.estado === "revocada") {
      return new Response(
        JSON.stringify({ ok: false, code: "LICENSE_REVOKED", message: "Tu licencia fue revocada. Contacta a TyrAdvisor." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (licencia.estado === "expirada" || licencia.fecha_expiracion < hoy) {
      // Marcar como expirada si no lo estaba
      if (licencia.estado !== "expirada") {
        await supabaseAdmin
          .from("licencias")
          .update({ estado: "expirada" })
          .eq("id", licencia.id);
      }
      return new Response(
        JSON.stringify({ ok: false, code: "LICENSE_EXPIRED", message: "Tu licencia venció. Renueva contactando a TyrAdvisor." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const plan = licencia.planes as any;

    // 4. Verificar límite de dispositivos
    const { data: activaciones, error: actError } = await supabaseAdmin
      .from("activaciones")
      .select("id, fingerprint")
      .eq("licencia_id", licencia.id)
      .eq("activa", true);

    const dispositivosUsados = activaciones?.length ?? 0;
    const esteDispositivoYaRegistrado = activaciones?.some((a: any) => a.fingerprint === fingerprint);

    if (
      !esteDispositivoYaRegistrado &&
      plan.max_dispositivos !== -1 &&
      dispositivosUsados >= plan.max_dispositivos
    ) {
      return new Response(
        JSON.stringify({
          ok: false,
          code: "DEVICE_LIMIT_REACHED",
          message: `Ya tienes el máximo de ${plan.max_dispositivos} dispositivo(s) activado(s). Libera uno desde Mi Cuenta.`,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Registrar o actualizar activación
    if (esteDispositivoYaRegistrado) {
      await supabaseAdmin
        .from("activaciones")
        .update({ last_seen: new Date().toISOString(), user_agent })
        .eq("licencia_id", licencia.id)
        .eq("fingerprint", fingerprint);
    } else {
      await supabaseAdmin.from("activaciones").insert({
        licencia_id: licencia.id,
        fingerprint,
        user_agent,
        ip_first: clientIp,
        ip_last: clientIp,
        activa: true,
      });
    }

    // 6. Emitir JWT firmado
    const jwtSecret = Deno.env.get("JWT_SECRET")!;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    const diasOffline = plan.dias_offline ?? 7;
    const expTimestamp = getNumericDate(diasOffline * 24 * 60 * 60); // segundos

    const token = await create(
      { alg: "HS256", typ: "JWT" },
      {
        sub: authUserId,
        licencia_id: licencia.id,
        plan: licencia.plan_id,
        feature_flags: plan.feature_flags,
        max_skus: plan.max_skus,
        fingerprint,
        exp: expTimestamp,
        iat: getNumericDate(0),
        iss: "ihc-tyradvisor",
      },
      key
    );

    // 7. Registrar evento validacion_ok + intento exitoso (para auditoría
    // de intentos exitosos por IP, aunque no cuente para el rate limit).
    await supabaseAdmin.from("eventos_licencia").insert({
      licencia_id: licencia.id,
      tipo: "validacion_ok",
      detalle: { fingerprint, plan: licencia.plan_id },
      ip: clientIp,
    });
    await logLoginAttempt(supabaseAdmin, clientIp, email, true);

    // 8. Respuesta exitosa
    return new Response(
      JSON.stringify({
        ok: true,
        token,
        plan: licencia.plan_id,
        feature_flags: plan.feature_flags,
        max_skus: plan.max_skus,
        max_dispositivos: plan.max_dispositivos,
        dispositivos_usados: dispositivosUsados + (esteDispositivoYaRegistrado ? 0 : 1),
        fecha_expiracion: licencia.fecha_expiracion,
        dias_offline_permitidos: diasOffline,
        cliente: {
          razon_social: (licencia.clientes as any)?.razon_social ?? null,
          logo_url: null,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error en validate-license:", err);
    return new Response(
      JSON.stringify({ ok: false, code: "INTERNAL_ERROR", message: "Error interno del servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
