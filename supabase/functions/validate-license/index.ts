// supabase/functions/validate-license/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting en memoria (se resetea con cada cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5 minutos
  const maxAttempts = 5;

  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true; // OK
  }
  if (entry.count >= maxAttempts) return false; // Bloqueado
  entry.count++;
  return true; // OK
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Rate limiting por IP
    const clientIp = req.headers.get("x-forwarded-for") ?? "unknown";
    if (!checkRateLimit(clientIp)) {
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

    // Cliente Supabase con service role (acceso total)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Autenticar con Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      // Registrar intento fallido
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

    // 7. Registrar evento validacion_ok
    await supabaseAdmin.from("eventos_licencia").insert({
      licencia_id: licencia.id,
      tipo: "validacion_ok",
      detalle: { fingerprint, plan: licencia.plan_id },
      ip: clientIp,
    });

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
