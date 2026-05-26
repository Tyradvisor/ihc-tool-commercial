// supabase/functions/heartbeat/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, getNumericDate, verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Extraer JWT del header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ ok: false, code: "NO_TOKEN", message: "Token requerido." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.replace("Bearer ", "");

    // Verificar JWT
    const jwtSecret = Deno.env.get("JWT_SECRET")!;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    let payload: any;
    try {
      payload = await verify(token, key);
    } catch {
      return new Response(
        JSON.stringify({ ok: false, code: "INVALID_TOKEN", message: "Token inválido o expirado." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { fingerprint } = await req.json();
    const clientIp = req.headers.get("x-forwarded-for") ?? "unknown";

    // SECURITY: Validate that fingerprint from body matches the one in JWT payload
    if (!fingerprint || fingerprint !== payload.fingerprint) {
      return new Response(
        JSON.stringify({
          ok: false,
          code: "FINGERPRINT_MISMATCH",
          message: "Intento de acceso desde dispositivo no autorizado."
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verificar que la licencia sigue activa y vigente
    const hoy = new Date().toISOString().split("T")[0];
    const { data: licencia, error } = await supabaseAdmin
      .from("licencias")
      .select("id, estado, fecha_expiracion, plan_id, planes(dias_offline, feature_flags, max_skus, max_dispositivos)")
      .eq("id", payload.licencia_id)
      .single();

    if (error || !licencia) {
      return new Response(
        JSON.stringify({ ok: false, code: "LICENSE_NOT_FOUND" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (licencia.estado === "revocada") {
      return new Response(
        JSON.stringify({ ok: false, code: "LICENSE_REVOKED", message: "Tu licencia fue revocada." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (licencia.estado === "suspendida") {
      return new Response(
        JSON.stringify({ ok: false, code: "LICENSE_SUSPENDED", message: "Tu licencia está suspendida." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (licencia.fecha_expiracion < hoy) {
      await supabaseAdmin.from("licencias").update({ estado: "expirada" }).eq("id", licencia.id);
      return new Response(
        JSON.stringify({ ok: false, code: "LICENSE_EXPIRED", message: "Tu licencia venció." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Actualizar last_seen de la activación
    await supabaseAdmin
      .from("activaciones")
      .update({ last_seen: new Date().toISOString(), ip_last: clientIp })
      .eq("licencia_id", licencia.id)
      .eq("fingerprint", fingerprint)
      .eq("activa", true);

    // Emitir JWT renovado
    const plan = licencia.planes as any;
    const diasOffline = plan.dias_offline ?? 7;
    const expTimestamp = getNumericDate(diasOffline * 24 * 60 * 60);

    const newToken = await create(
      { alg: "HS256", typ: "JWT" },
      {
        sub: payload.sub,
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

    return new Response(
      JSON.stringify({
        ok: true,
        token: newToken,
        fecha_expiracion: licencia.fecha_expiracion,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error en heartbeat:", err);
    return new Response(
      JSON.stringify({ ok: false, code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
