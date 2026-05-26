// supabase/functions/send-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Templates de email
const templates = {

  bienvenida: (data: any) => ({
    subject: `Bienvenido a IHC Tool™ — Tus credenciales de acceso`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <tr><td style="background:#0A1628;padding:28px 36px;">
          <div style="font-size:22px;font-weight:900;color:#fff;">IHC <span style="color:#00B4D8">Tool™</span></div>
          <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px;">Inventory Health Check · TyrAdvisor</div>
        </td></tr>
        <tr><td style="padding:36px;">
          <p style="font-size:16px;font-weight:700;color:#0A1628;margin:0 0 8px">Hola ${data.nombre},</p>
          <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 24px">Tu licencia <strong>IHC Tool™ ${data.plan}</strong> está lista. Aquí tienes tus credenciales de acceso:</p>
          <table width="100%" style="background:#F8FAFC;border-radius:8px;padding:20px;margin-bottom:24px;">
            <tr><td style="font-size:12px;color:#64748B;padding-bottom:4px;">Email</td></tr>
            <tr><td style="font-size:15px;font-weight:700;color:#0A1628;padding-bottom:16px;">${data.email}</td></tr>
            <tr><td style="font-size:12px;color:#64748B;padding-bottom:4px;">Contraseña temporal</td></tr>
            <tr><td style="font-size:15px;font-weight:700;color:#0A1628;">${data.password_temporal}</td></tr>
          </table>
          <p style="font-size:13px;color:#94A3B8;margin:0 0 24px">⚠️ Cambia tu contraseña en el primer acceso desde Mi Cuenta.</p>
          <table width="100%" style="margin-bottom:28px;">
            <tr><td style="background:#F1F5F9;border-radius:8px;padding:16px;">
              <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#64748B;margin:0 0 8px">Tu plan ${data.plan} incluye:</p>
              <p style="font-size:13px;color:#1E293B;margin:4px 0">✅ ${data.max_skus === -1 ? 'SKUs ilimitados' : data.max_skus.toLocaleString('es-CL') + ' SKUs por archivo'}</p>
              <p style="font-size:13px;color:#1E293B;margin:4px 0">✅ ${data.max_dispositivos === -1 ? 'Dispositivos ilimitados' : data.max_dispositivos + ' dispositivo(s)'}</p>
              <p style="font-size:13px;color:#1E293B;margin:4px 0">✅ Vigencia hasta ${data.fecha_expiracion}</p>
            </td></tr>
          </table>
          <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 8px">🔒 <strong>Recuerda:</strong> tus datos de inventario nunca salen de tu computador. Solo tu licencia se verifica en línea.</p>
          <p style="font-size:14px;color:#475569;margin:0">Cualquier duda escríbeme a <a href="mailto:contacto@tyradvisor.com" style="color:#00B4D8">contacto@tyradvisor.com</a></p>
        </td></tr>
        <tr><td style="background:#F8FAFC;padding:20px 36px;border-top:1px solid #E2E8F0;">
          <p style="font-size:11px;color:#94A3B8;margin:0">TyrAdvisor SpA · RUT 78.192.245-5 · Antonio Bellet 193, Of. 1210, Providencia, Santiago</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  }),

  expiracion_30: (data: any) => ({
    subject: `IHC Tool™ — Tu licencia vence en 30 días`,
    html: `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
      <tr><td style="background:#0A1628;padding:28px 36px;">
        <div style="font-size:22px;font-weight:900;color:#fff;">IHC <span style="color:#00B4D8">Tool™</span></div>
      </td></tr>
      <tr><td style="padding:36px;">
        <div style="background:#FEF9C3;border:1px solid #FDE047;border-radius:8px;padding:16px;margin-bottom:24px;">
          <p style="font-size:14px;font-weight:700;color:#854D0E;margin:0">⏰ Tu licencia vence en 30 días</p>
        </div>
        <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 16px">Hola ${data.nombre},</p>
        <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 16px">Tu licencia <strong>IHC Tool™ ${data.plan}</strong> vence el <strong>${data.fecha_expiracion}</strong>.</p>
        <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 24px">Para renovar sin interrupciones, responde este email o escríbeme a <a href="mailto:contacto@tyradvisor.com" style="color:#00B4D8">contacto@tyradvisor.com</a>.</p>
        <p style="font-size:13px;color:#94A3B8;">TyrAdvisor SpA · contacto@tyradvisor.com</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
  }),

  expiracion_15: (data: any) => ({
    subject: `IHC Tool™ — Tu licencia vence en 15 días ⚠️`,
    html: `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
      <tr><td style="background:#0A1628;padding:28px 36px;">
        <div style="font-size:22px;font-weight:900;color:#fff;">IHC <span style="color:#00B4D8">Tool™</span></div>
      </td></tr>
      <tr><td style="padding:36px;">
        <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:16px;margin-bottom:24px;">
          <p style="font-size:14px;font-weight:700;color:#991B1B;margin:0">🚨 Tu licencia vence en 15 días</p>
        </div>
        <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 16px">Hola ${data.nombre},</p>
        <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 16px">Quedan solo <strong>15 días</strong> para que tu licencia <strong>IHC Tool™ ${data.plan}</strong> venza el <strong>${data.fecha_expiracion}</strong>.</p>
        <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 24px">Renueva ahora para no perder el acceso. Escríbeme a <a href="mailto:contacto@tyradvisor.com" style="color:#00B4D8">contacto@tyradvisor.com</a>.</p>
        <p style="font-size:13px;color:#94A3B8;">TyrAdvisor SpA · contacto@tyradvisor.com</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
  }),

  expiracion_0: (data: any) => ({
    subject: `IHC Tool™ — Tu licencia venció hoy`,
    html: `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
      <tr><td style="background:#0A1628;padding:28px 36px;">
        <div style="font-size:22px;font-weight:900;color:#fff;">IHC <span style="color:#00B4D8">Tool™</span></div>
      </td></tr>
      <tr><td style="padding:36px;">
        <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:16px;margin-bottom:24px;">
          <p style="font-size:14px;font-weight:700;color:#991B1B;margin:0">🔴 Tu licencia venció hoy</p>
        </div>
        <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 16px">Hola ${data.nombre},</p>
        <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 16px">Tu licencia <strong>IHC Tool™ ${data.plan}</strong> venció el <strong>${data.fecha_expiracion}</strong>. El acceso está suspendido.</p>
        <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 24px">Para reactivarla escríbeme a <a href="mailto:contacto@tyradvisor.com" style="color:#00B4D8">contacto@tyradvisor.com</a> y te genero la renovación en minutos.</p>
        <p style="font-size:13px;color:#94A3B8;">TyrAdvisor SpA · contacto@tyradvisor.com</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
  }),

};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // SECURITY: Require Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ ok: false, error: "Token requerido para enviar emails." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.replace("Bearer ", "");

    // SECURITY: Verify JWT
    const jwtSecret = Deno.env.get("JWT_SECRET")!;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    let payload: any;
    try {
      payload = await verify(token, key);
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "Token inválido o expirado." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Check that user is admin
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", payload.sub)
      .single();

    if (roleError || !userRole || userRole.role !== "admin") {
      return new Response(
        JSON.stringify({ ok: false, error: "Acceso denegado. Solo admins pueden enviar emails." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { template, to_email, to_name, data } = await req.json();

    if (!template || !to_email) {
      return new Response(
        JSON.stringify({ ok: false, error: "template y to_email son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const templateFn = templates[template as keyof typeof templates];
    if (!templateFn) {
      return new Response(
        JSON.stringify({ ok: false, error: `Template '${template}' no existe` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { subject, html } = templateFn({ nombre: to_name, ...data });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "IHC Tool™ TyrAdvisor <contacto@tyradvisor.com>",
        to: [to_email],
        subject,
        html,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("Resend error:", result);
      return new Response(
        JSON.stringify({ ok: false, error: result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, id: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Error en send-email:", err);
    return new Response(
      JSON.stringify({ ok: false, error: "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
