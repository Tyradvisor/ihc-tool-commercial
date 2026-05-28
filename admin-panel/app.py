# admin-panel/app.py
# IHC Tool™ — Panel de Administración
# TyrAdvisor · Sprint 3

import streamlit as st
import pandas as pd
from supabase import create_client, Client
import os
import secrets
import string
from datetime import date, timedelta
import requests

# ── CONFIGURACIÓN ────────────────────────────────────────────
def _get_secret(key: str, default: str = "") -> str:
    """Lee secret desde st.secrets (Streamlit Cloud) con fallback a os.environ (local/.env)."""
    try:
        if hasattr(st, "secrets") and key in st.secrets:
            return st.secrets[key]
    except Exception:
        pass
    return os.environ.get(key, default)

SUPABASE_URL = _get_secret("SUPABASE_URL")
SUPABASE_KEY = _get_secret("SUPABASE_SERVICE_ROLE_KEY")
SEND_EMAIL_URL = f"{SUPABASE_URL}/functions/v1/send-email"
ANON_KEY = _get_secret("SUPABASE_ANON_KEY")

st.set_page_config(
    page_title="IHC Tool™ Admin",
    page_icon="🔑",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ── CSS PROFESIONAL ───────────────────────────────────────────
st.markdown("""
<style>
  * { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

  .main {
    background: linear-gradient(135deg, #0F1419 0%, #1A2332 100%);
    color: #E2E8F0;
  }

  /* ── LOGIN ── */
  .login-container {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 16px;
    padding: 48px 40px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(0, 180, 216, 0.1);
  }

  .login-header {
    text-align: center;
    margin-bottom: 32px;
  }

  .login-title {
    font-size: 32px;
    font-weight: 900;
    color: #0A1628;
    margin: 0;
    letter-spacing: -0.5px;
  }

  .login-subtitle {
    font-size: 13px;
    color: #64748B;
    margin-top: 6px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  /* ── TOPBAR ── */
  .topbar {
    background: linear-gradient(90deg, #0A1628 0%, #0D1F2D 100%);
    padding: 16px 24px;
    border-bottom: 1px solid #00B4D8;
    margin-bottom: 24px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 180, 216, 0.1);
  }

  /* ── METRIC CARDS ── */
  .metric-card {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%);
    border-radius: 12px;
    padding: 20px 24px;
    border: 1px solid rgba(0, 180, 216, 0.2);
    transition: all 0.3s ease;
    margin-bottom: 12px;
  }

  .metric-card:hover {
    background: linear-gradient(135deg, rgba(0, 180, 216, 0.15) 0%, rgba(0, 180, 216, 0.05) 100%);
    border-color: rgba(0, 180, 216, 0.4);
    transform: translateY(-2px);
  }

  .metric-label {
    font-size: 12px;
    color: #94A3B8;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 8px;
    font-weight: 600;
  }

  .metric-value {
    font-size: 28px;
    color: #00B4D8;
    font-weight: 700;
  }

  /* ── BADGES ── */
  .badge-activa {
    background: rgba(16, 185, 129, 0.2);
    color: #10B981;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid rgba(16, 185, 129, 0.3);
    display: inline-block;
  }

  .badge-expirada {
    background: rgba(239, 68, 68, 0.2);
    color: #EF4444;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid rgba(239, 68, 68, 0.3);
    display: inline-block;
  }

  .badge-suspendida {
    background: rgba(245, 158, 11, 0.2);
    color: #F59E0B;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid rgba(245, 158, 11, 0.3);
    display: inline-block;
  }

  .badge-revocada {
    background: rgba(107, 114, 128, 0.2);
    color: #9CA3AF;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid rgba(107, 114, 128, 0.3);
    display: inline-block;
  }

  /* ── HEADERS ── */
  .stMarkdown h1 { color: #00B4D8 !important; font-weight: 800 !important; }
  .stMarkdown h2 { color: #E2E8F0 !important; font-weight: 700 !important; }
  .stMarkdown h3 { color: #CBD5E1 !important; font-weight: 700 !important; }

  /* ── DATAFRAME ── */
  .stDataFrame { background: rgba(255, 255, 255, 0.05) !important; border-radius: 8px !important; }

  /* ── BUTTONS ── */
  .stButton > button {
    background: linear-gradient(135deg, #00B4D8 0%, #0090B8 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    transition: all 0.3s ease;
  }

  .stButton > button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 180, 216, 0.4);
  }

  /* ── INPUTS ── */
  .stTextInput > div > div > input,
  .stTextArea > div > div > textarea,
  .stSelectbox > div > div > select {
    background: rgba(255, 255, 255, 0.08) !important;
    border: 1px solid rgba(0, 180, 216, 0.2) !important;
    color: #E2E8F0 !important;
    border-radius: 8px !important;
  }

  /* ── SIDEBAR ── */
  section[data-testid="stSidebar"],
  .stSidebar {
    background: rgba(10, 22, 40, 0.95) !important;
    border-right: 1px solid #00B4D8;
  }

  /* NUCLEAR: cualquier texto dentro del sidebar = blanco legible */
  section[data-testid="stSidebar"] *:not(button):not(svg):not(path),
  section[data-testid="stSidebar"] p,
  section[data-testid="stSidebar"] span,
  section[data-testid="stSidebar"] div,
  section[data-testid="stSidebar"] label,
  section[data-testid="stSidebar"] h1,
  section[data-testid="stSidebar"] h2,
  section[data-testid="stSidebar"] h3,
  section[data-testid="stSidebar"] h4,
  section[data-testid="stSidebar"] h5,
  section[data-testid="stSidebar"] h6,
  section[data-testid="stSidebar"] .stMarkdown,
  section[data-testid="stSidebar"] .stMarkdown *,
  section[data-testid="stSidebar"] .stRadio *,
  section[data-testid="stSidebar"] [data-baseweb="radio"] *,
  section[data-testid="stSidebar"] div[role="radiogroup"] *,
  section[data-testid="stSidebar"] div[role="radiogroup"] label,
  section[data-testid="stSidebar"] div[role="radiogroup"] label p,
  section[data-testid="stSidebar"] div[role="radiogroup"] label span,
  section[data-testid="stSidebar"] div[role="radiogroup"] label div {
    color: #F8FAFC !important;
  }

  /* Items de radio: padding, hover, ítem activo */
  section[data-testid="stSidebar"] div[role="radiogroup"] > label {
    padding: 8px 10px !important;
    border-radius: 6px !important;
    margin-bottom: 4px !important;
    transition: background 0.15s ease;
    cursor: pointer;
  }
  section[data-testid="stSidebar"] div[role="radiogroup"] > label:hover {
    background: rgba(0, 180, 216, 0.15) !important;
  }
  /* Ítem seleccionado: fondo destacado */
  section[data-testid="stSidebar"] div[role="radiogroup"] > label:has(input:checked) {
    background: rgba(0, 180, 216, 0.20) !important;
  }

  /* Email admin (en card cyan) mantiene color marca — más específico que regla NUCLEAR */
  section[data-testid="stSidebar"] p[style*="#00B4D8"] {
    color: #00B4D8 !important;
  }

  /* ── DIVIDER ── */
  hr { border-color: rgba(0, 180, 216, 0.2) !important; }

  /* ── MESSAGES ── */
  .stSuccess { background: rgba(16, 185, 129, 0.1) !important; border-left: 4px solid #10B981 !important; }
  .stError { background: rgba(239, 68, 68, 0.1) !important; border-left: 4px solid #EF4444 !important; }
  .stWarning { background: rgba(245, 158, 11, 0.1) !important; border-left: 4px solid #F59E0B !important; }
  .stInfo { background: rgba(0, 180, 216, 0.1) !important; border-left: 4px solid #00B4D8 !important; }
</style>
""", unsafe_allow_html=True)

# ── CONEXIÓN SUPABASE ─────────────────────────────────────────

@st.cache_resource
def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)

# ── HELPERS ───────────────────────────────────────────────────

def gen_password(length=12):
    chars = string.ascii_letters + string.digits + "!@#$"
    return ''.join(secrets.choice(chars) for _ in range(length))

def send_email(template, to_email, to_name, data, jwt_token):
    try:
        res = requests.post(
            SEND_EMAIL_URL,
            json={"template": template, "to_email": to_email, "to_name": to_name, "data": data},
            headers={"apikey": ANON_KEY, "Authorization": f"Bearer {jwt_token}",
                     "Content-Type": "application/json"},
            timeout=10
        )
        return res.json()
    except Exception as e:
        return {"ok": False, "error": str(e)}

def format_fecha(fecha_str):
    if not fecha_str: return "—"
    try:
        d = date.fromisoformat(str(fecha_str)[:10])
        return d.strftime("%d %b %Y")
    except: return str(fecha_str)[:10]

# ── LOGIN ─────────────────────────────────────────────────────

def login_page():
    col1, col2, col3 = st.columns([1, 1.5, 1])
    with col2:
        st.markdown("""
        <div class="login-container">
            <div class="login-header">
                <p class="login-title">IHC <span style="color:#00B4D8">Tool™</span></p>
                <p class="login-subtitle">Inventory Health Check · TyrAdvisor</p>
            </div>
        </div>
        """, unsafe_allow_html=True)

        st.markdown("")
        email = st.text_input("📧 Email", placeholder="tu@tyradvisor.com")
        password = st.text_input("🔐 Contraseña", type="password", placeholder="••••••••")

        st.markdown("")
        col_btn1, col_btn2 = st.columns(2)
        with col_btn1:
            pass
        with col_btn2:
            if st.button("🚀 Ingresar", use_container_width=True, type="primary"):
                if not email or not password:
                    st.error("⚠️ Ingresa email y contraseña.")
                    return
                try:
                    with st.spinner("Verificando credenciales..."):
                        sb = get_supabase()
                        auth = sb.auth.sign_in_with_password({"email": email, "password": password})
                        user_id = auth.user.id
                        # Verificar rol admin (columna real en BD: "rol")
                        role = sb.table("user_roles").select("rol").eq("user_id", user_id).single().execute()
                        if role.data and role.data.get("rol") == "admin":
                            st.session_state["authenticated"] = True
                            st.session_state["user_email"] = email
                            st.session_state["jwt"] = auth.session.access_token
                            st.success("✅ ¡Bienvenido!")
                            st.rerun()
                        else:
                            st.error("🚫 Acceso denegado. Solo administradores.")
                except Exception as e:
                    # Mostrar detalle del error para diagnóstico (sin exponer secretos)
                    err_msg = str(e)
                    if "Invalid login credentials" in err_msg or "invalid_grant" in err_msg:
                        st.error("❌ Email o contraseña incorrectos.")
                    elif "PGRST116" in err_msg or "0 rows" in err_msg:
                        st.error("🚫 Usuario sin rol admin asignado.")
                    else:
                        st.error(f"❌ Error de login: {err_msg[:200]}")

# ── VISTA COMPLETA DEL CLIENTE ────────────────────────────────

def vista_completa_cliente(cliente_id):
    """Vista detallada de un cliente con KPIs y tabs de Datos/Licencias/Activaciones/Eventos."""
    sb = get_supabase()

    # Cargar cliente
    try:
        cliente_res = sb.table("clientes").select("*").eq("id", cliente_id).single().execute()
        cliente = cliente_res.data
    except Exception:
        st.error("Cliente no encontrado.")
        if st.button("← Volver a clientes", key="back_404"):
            st.session_state.pop("vista_cliente_id", None)
            st.rerun()
        return

    # Botón volver
    col_back, _ = st.columns([1, 4])
    with col_back:
        if st.button("← Volver a clientes", key="back_to_clientes", use_container_width=True):
            st.session_state.pop("vista_cliente_id", None)
            st.session_state.pop("editando_cliente", None)
            st.rerun()

    # Header
    st.markdown(f"# {cliente['razon_social']}")
    info_parts = []
    if cliente.get("rut"):
        info_parts.append(f"RUT {cliente['rut']}")
    if cliente.get("contacto_email"):
        info_parts.append(cliente["contacto_email"])
    if cliente.get("industria"):
        info_parts.append(f"Industria: {cliente['industria']}")
    st.caption(" · ".join(info_parts) if info_parts else "Sin información adicional")

    # Cargar relacionados
    licencias_res = sb.table("licencias").select(
        "*, planes(nombre)"
    ).eq("cliente_id", cliente_id).order("created_at", desc=True).execute()
    licencias = licencias_res.data or []
    lic_ids = [l["id"] for l in licencias]

    activaciones, eventos = [], []
    if lic_ids:
        try:
            act_res = sb.table("activaciones").select("*").in_("licencia_id", lic_ids).order("last_seen", desc=True).execute()
            activaciones = act_res.data or []
        except Exception:
            pass
        try:
            ev_res = sb.table("eventos_licencia").select("*").in_("licencia_id", lic_ids).order("created_at", desc=True).execute()
            eventos = ev_res.data or []
        except Exception:
            pass

    # KPIs
    licencias_activas = [l for l in licencias if l.get("estado") == "activa"]
    revenue_total = sum(l.get("precio_pagado_clp") or 0 for l in licencias)
    activaciones_activas = [a for a in activaciones if a.get("activa")]

    k1, k2, k3, k4 = st.columns(4)
    k1.metric("LICENCIAS", len(licencias))
    k2.metric("ACTIVAS", len(licencias_activas))
    k3.metric("REVENUE TOTAL", f"${revenue_total:,.0f}".replace(",", "."))
    k4.metric("ACTIVACIONES", len(activaciones_activas))

    st.markdown("---")

    # Tabs
    tabs = st.tabs([
        "📋 Datos",
        f"🔑 Licencias ({len(licencias)})",
        f"📱 Activaciones ({len(activaciones)})",
        f"🕐 Eventos ({len(eventos)})",
    ])

    # ── TAB 1: Datos ──
    with tabs[0]:
        editando = st.session_state.get("editando_cliente") == cliente_id

        if not editando:
            if st.button("✏️ Editar datos", key="btn_editar_cliente"):
                st.session_state["editando_cliente"] = cliente_id
                st.rerun()

            st.markdown(f"**Razón Social:** {cliente.get('razon_social','—')}")
            st.markdown(f"**RUT:** {cliente.get('rut') or '—'}")
            st.markdown(f"**Email contacto:** {cliente.get('contacto_email','—')}")
            st.markdown(f"**Nombre contacto:** {cliente.get('contacto_nombre') or '—'}")
            st.markdown(f"**Teléfono:** {cliente.get('contacto_telefono') or '—'}")
            st.markdown(f"**Industria:** {cliente.get('industria') or '—'}")
            st.markdown(f"**Fecha alta:** {format_fecha(cliente.get('created_at'))}")
            st.markdown(f"**Notas internas:** {cliente.get('notas') or '—'}")
        else:
            with st.form(f"form_editar_cliente_{cliente_id}"):
                ec1, ec2 = st.columns(2)
                with ec1:
                    e_razon = st.text_input("Razón social *", value=cliente.get("razon_social","") or "")
                    e_email = st.text_input("Email contacto *", value=cliente.get("contacto_email","") or "")
                    e_nombre = st.text_input("Nombre contacto", value=cliente.get("contacto_nombre","") or "")
                with ec2:
                    e_rut = st.text_input("RUT", value=cliente.get("rut","") or "")
                    e_tel = st.text_input("Teléfono", value=cliente.get("contacto_telefono","") or "")
                    e_industria = st.text_input("Industria", value=cliente.get("industria","") or "")
                e_notas = st.text_area("Notas internas", value=cliente.get("notas","") or "", height=80)

                col_save, col_cancel = st.columns(2)
                with col_save:
                    submitted = st.form_submit_button("💾 Guardar cambios", type="primary", use_container_width=True)
                with col_cancel:
                    cancelled = st.form_submit_button("✖ Cancelar", use_container_width=True)

                if submitted:
                    if not e_razon or not e_email:
                        st.error("Razón social y email son obligatorios.")
                    else:
                        try:
                            sb.table("clientes").update({
                                "razon_social": e_razon,
                                "rut": e_rut or None,
                                "contacto_email": e_email,
                                "contacto_nombre": e_nombre or None,
                                "contacto_telefono": e_tel or None,
                                "industria": e_industria or None,
                                "notas": e_notas or None,
                            }).eq("id", cliente_id).execute()
                            st.session_state.pop("editando_cliente", None)
                            st.success("✅ Cliente actualizado.")
                            st.rerun()
                        except Exception as e:
                            st.error(f"Error al actualizar: {e}")
                if cancelled:
                    st.session_state.pop("editando_cliente", None)
                    st.rerun()

    # ── TAB 2: Licencias ──
    with tabs[1]:
        if not licencias:
            st.info("Este cliente aún no tiene licencias emitidas.")
        else:
            rows = []
            for l in licencias:
                plan_name = (l.get("planes") or {}).get("nombre") if l.get("planes") else None
                plan_name = plan_name or (l.get("plan_id") or "—")
                rows.append({
                    "Plan": str(plan_name).capitalize(),
                    "Estado": (l.get("estado","—") or "—").capitalize(),
                    "Inicio": format_fecha(l.get("fecha_inicio")),
                    "Vence": format_fecha(l.get("fecha_expiracion")),
                    "Precio": f"${(l.get('precio_pagado_clp') or 0):,.0f}".replace(",", "."),
                    "Factura": l.get("factura_numero") or "—",
                    "ID": (l.get("id","") or "")[:8] + "...",
                })
            st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)
        st.divider()
        st.info("💡 Para emitir una nueva licencia a este cliente, ve a **🔑 Licencias** en el menú lateral.")

    # ── TAB 3: Activaciones ──
    with tabs[2]:
        if not activaciones:
            st.info("No hay activaciones registradas en las licencias de este cliente.")
        else:
            rows = []
            for a in activaciones:
                rows.append({
                    "Fingerprint": (a.get("fingerprint") or "")[:16] + "...",
                    "User Agent": (a.get("user_agent") or "")[:50],
                    "IP": str(a.get("ip_last") or a.get("ip_first") or "—"),
                    "Último acceso": format_fecha(a.get("last_seen")),
                    "Activa": "✅" if a.get("activa") else "❌",
                })
            st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)

    # ── TAB 4: Eventos ──
    with tabs[3]:
        if not eventos:
            st.info("Sin eventos registrados (suspensiones, reactivaciones, revocaciones).")
        else:
            rows = []
            for ev in eventos:
                rows.append({
                    "Tipo": (ev.get("tipo","—") or "—").capitalize(),
                    "Fecha": format_fecha(ev.get("created_at")),
                    "Licencia": (ev.get("licencia_id","") or "")[:8] + "...",
                })
            st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)


# ── SECCIÓN: CLIENTES ─────────────────────────────────────────

def seccion_clientes():
    # Router: si hay un cliente seleccionado para vista completa, renderizar esa vista
    if st.session_state.get("vista_cliente_id"):
        vista_completa_cliente(st.session_state["vista_cliente_id"])
        return

    sb = get_supabase()
    st.markdown("# 👥 Clientes")
    st.markdown("Administra tus clientes y contactos principales")

    # Buscador
    buscar = st.text_input("🔍 Buscar por razón social, email o RUT", placeholder="Ej: Empresa SpA")

    # Listar clientes
    query = sb.table("clientes").select("*").order("created_at", desc=True)
    result = query.execute()
    clientes = result.data or []

    if buscar:
        t = buscar.lower()
        clientes = [c for c in clientes if
                    t in (c.get("razon_social") or "").lower() or
                    t in (c.get("contacto_email") or "").lower() or
                    t in (c.get("rut") or "").lower()]

    st.caption(f"{len(clientes)} cliente(s) encontrado(s)")

    if clientes:
        df = pd.DataFrame(clientes)[["razon_social","rut","contacto_email","contacto_nombre","created_at"]]
        df.columns = ["Razón Social","RUT","Email","Contacto","Fecha Alta"]
        df["Fecha Alta"] = df["Fecha Alta"].apply(lambda x: str(x)[:10] if x else "")
        st.dataframe(df, use_container_width=True, hide_index=True)

        st.markdown("---")
        st.subheader("Gestionar cliente")
        cliente_names = {f"{c['razon_social']} ({c['contacto_email']})": c for c in clientes}
        sel = st.selectbox("Selecciona cliente", list(cliente_names.keys()))
        cliente_sel = cliente_names[sel]

        col1, col2, col3 = st.columns(3)
        with col1:
            if st.button("📝 Ver detalles", use_container_width=True):
                st.info(f"""
                **Razón Social:** {cliente_sel.get('razon_social')}
                **RUT:** {cliente_sel.get('rut') or '—'}
                **Email:** {cliente_sel.get('contacto_email')}
                **Contacto:** {cliente_sel.get('contacto_nombre') or '—'}
                **Teléfono:** {cliente_sel.get('contacto_telefono') or '—'}
                **Industria:** {cliente_sel.get('industria') or '—'}
                **Notas:** {cliente_sel.get('notas') or '—'}
                """)
        with col2:
            if st.button("📂 Vista completa", use_container_width=True, type="primary"):
                st.session_state["vista_cliente_id"] = cliente_sel["id"]
                st.rerun()
        with col3:
            # Confirmación en dos pasos vía session_state (anti-patrón: checkbox dentro de if button)
            if st.button("🗑️ Eliminar cliente", use_container_width=True, type="secondary"):
                st.session_state["cliente_a_eliminar"] = cliente_sel["id"]
                st.session_state["cliente_a_eliminar_nombre"] = cliente_sel["razon_social"]
                st.rerun()

        # Bloque de confirmación: aparece solo cuando hay un cliente marcado para eliminar
        if st.session_state.get("cliente_a_eliminar") == cliente_sel["id"]:
            st.warning(f"⚠️ ¿Confirmas eliminar **{st.session_state['cliente_a_eliminar_nombre']}**? Esta acción no se puede deshacer.")
            cc1, cc2 = st.columns(2)
            with cc1:
                if st.button("✅ Sí, eliminar", type="primary", use_container_width=True, key="confirm_delete_cliente"):
                    try:
                        sb.table("clientes").delete().eq("id", cliente_sel["id"]).execute()
                        st.session_state.pop("cliente_a_eliminar", None)
                        st.session_state.pop("cliente_a_eliminar_nombre", None)
                        st.success(f"✅ Cliente eliminado.")
                        st.rerun()
                    except Exception as e:
                        err_msg = str(e)
                        if "foreign key" in err_msg.lower() or "violates" in err_msg.lower():
                            st.error("❌ No se puede eliminar: este cliente tiene licencias asociadas. Elimina sus licencias primero.")
                        else:
                            st.error(f"❌ Error al eliminar: {err_msg[:200]}")
            with cc2:
                if st.button("✖ Cancelar", use_container_width=True, key="cancel_delete_cliente"):
                    st.session_state.pop("cliente_a_eliminar", None)
                    st.session_state.pop("cliente_a_eliminar_nombre", None)
                    st.rerun()

    st.divider()

    # Nuevo cliente
    with st.expander("➕ Nuevo cliente"):
        with st.form("form_nuevo_cliente"):
            col1, col2 = st.columns(2)
            with col1:
                razon_social = st.text_input("Razón social *")
                contacto_email = st.text_input("Email de contacto *")
                contacto_nombre = st.text_input("Nombre contacto")
            with col2:
                rut = st.text_input("RUT empresa (sin puntos, con guión)")
                contacto_telefono = st.text_input("Teléfono")
                industria = st.text_input("Industria")
            notas = st.text_area("Notas internas", height=80)
            submitted = st.form_submit_button("Crear cliente", type="primary")

            if submitted:
                if not razon_social or not contacto_email:
                    st.error("Razón social y email son requeridos.")
                else:
                    try:
                        sb.table("clientes").insert({
                            "razon_social": razon_social,
                            "rut": rut or None,
                            "contacto_email": contacto_email,
                            "contacto_nombre": contacto_nombre or None,
                            "contacto_telefono": contacto_telefono or None,
                            "industria": industria or None,
                            "notas": notas or None,
                        }).execute()
                        st.success(f"✅ Cliente '{razon_social}' creado.")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Error: {e}")

# ── SECCIÓN: LICENCIAS ────────────────────────────────────────

def seccion_licencias():
    sb = get_supabase()
    st.markdown("# 🔑 Licencias")
    st.markdown("Emite, suspende y revoca licencias de clientes")

    tabs = st.tabs(["Listado", "Emitir nueva licencia"])

    # ── TAB 1: Listado ──
    with tabs[0]:
        result = sb.table("licencias").select(
            "*, clientes(razon_social, contacto_email), planes(nombre)"
        ).order("created_at", desc=True).execute()
        licencias = result.data or []

        if licencias:
            rows = []
            for l in licencias:
                rows.append({
                    "Cliente": (l.get("clientes") or {}).get("razon_social","—"),
                    "Plan": (l.get("planes") or {}).get("nombre","—"),
                    "Estado": l.get("estado","—"),
                    "Inicio": format_fecha(l.get("fecha_inicio")),
                    "Vence": format_fecha(l.get("fecha_expiracion")),
                    "ID": l.get("id","")[:8] + "...",
                    "_id": l.get("id",""),
                    "_estado": l.get("estado",""),
                })
            df = pd.DataFrame(rows)
            st.dataframe(df[["Cliente","Plan","Estado","Inicio","Vence","ID"]],
                        use_container_width=True, hide_index=True)

            st.divider()
            st.subheader("Gestionar licencia")
            lic_ids = {f"{r['Cliente']} — {r['Plan']} ({r['_id'][:8]})": r['_id'] for r in rows}
            sel = st.selectbox("Selecciona licencia", list(lic_ids.keys()))
            lic_id = lic_ids[sel]

            col1, col2, col3 = st.columns(3)
            with col1:
                if st.button("⏸ Suspender", use_container_width=True):
                    sb.table("licencias").update({"estado":"suspendida"}).eq("id", lic_id).execute()
                    sb.table("eventos_licencia").insert({"licencia_id": lic_id, "tipo": "suspension"}).execute()
                    st.success("Licencia suspendida.")
                    st.rerun()
            with col2:
                if st.button("▶ Reactivar", use_container_width=True):
                    sb.table("licencias").update({"estado":"activa"}).eq("id", lic_id).execute()
                    sb.table("eventos_licencia").insert({"licencia_id": lic_id, "tipo": "reactivacion"}).execute()
                    st.success("Licencia reactivada.")
                    st.rerun()
            with col3:
                if st.button("🚫 Revocar", use_container_width=True, type="primary"):
                    confirmado = st.checkbox("Confirmo que quiero REVOCAR esta licencia (irreversible)")
                    if confirmado:
                        sb.table("licencias").update({"estado":"revocada"}).eq("id", lic_id).execute()
                        sb.table("eventos_licencia").insert({"licencia_id": lic_id, "tipo": "revocacion"}).execute()
                        st.warning("Licencia revocada.")
                        st.rerun()
        else:
            st.info("No hay licencias aún.")

    # ── TAB 2: Emitir nueva ──
    with tabs[1]:
        st.subheader("Emitir nueva licencia")

        # Cargar clientes para selector
        clientes_res = sb.table("clientes").select("id, razon_social, contacto_email, contacto_nombre").execute()
        clientes = clientes_res.data or []
        cliente_map = {f"{c['razon_social']} ({c['contacto_email']})": c for c in clientes}

        with st.form("form_emitir_licencia"):
            col1, col2 = st.columns(2)
            with col1:
                cliente_sel = st.selectbox("Cliente *", list(cliente_map.keys()))
                plan = st.selectbox("Plan *", ["starter","pro","enterprise"],
                                   format_func=lambda x: {"starter":"Starter — $960.000/año",
                                                           "pro":"Pro — $2.500.000/año",
                                                           "enterprise":"Enterprise — desde $4.800.000/año"}[x])
                duracion = st.selectbox("Duración", [12, 24, 36],
                                       format_func=lambda x: f"{x} meses")
            with col2:
                precio_pagado = st.number_input("Precio pagado (CLP)", min_value=0, step=10000)
                factura = st.text_input("N° Factura", placeholder="F-2026-0001")
                password_temp = st.text_input("Contraseña temporal",
                                             value=gen_password(),
                                             help="Se enviará al cliente por email")

            notas = st.text_area("Notas internas", height=60)
            enviar_email = st.checkbox("Enviar email de bienvenida al cliente", value=True)
            submitted = st.form_submit_button("✅ Emitir licencia", type="primary")

            if submitted:
                cliente = cliente_map[cliente_sel]
                try:
                    # 1. Crear usuario en Supabase Auth via REST directo
                    # (bypassa bugs conocidos del SDK con auth.admin.create_user)
                    create_user_resp = requests.post(
                        f"{SUPABASE_URL}/auth/v1/admin/users",
                        headers={
                            "apikey": SUPABASE_KEY,
                            "Authorization": f"Bearer {SUPABASE_KEY}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "email": cliente["contacto_email"],
                            "password": password_temp,
                            "email_confirm": True,
                        },
                        timeout=15,
                    )
                    if create_user_resp.status_code not in (200, 201):
                        body = create_user_resp.text
                        # Propagar mensaje claro al except de abajo
                        raise Exception(f"[{create_user_resp.status_code}] {body[:300]}")
                    auth_user_id = create_user_resp.json().get("id")
                    if not auth_user_id:
                        raise Exception(f"Respuesta sin user id: {create_user_resp.text[:200]}")

                    # 2. Asignar rol de usuario (columna real en BD: "rol")
                    sb.table("user_roles").insert({
                        "user_id": auth_user_id, "rol": "user"
                    }).execute()

                    # 3. Crear licencia
                    fecha_inicio = date.today()
                    fecha_exp = fecha_inicio + timedelta(days=30*duracion)
                    lic = sb.table("licencias").insert({
                        "cliente_id": cliente["id"],
                        "plan_id": plan,
                        "auth_user_id": auth_user_id,
                        "estado": "activa",
                        "fecha_inicio": str(fecha_inicio),
                        "fecha_expiracion": str(fecha_exp),
                        "precio_pagado_clp": precio_pagado or None,
                        "factura_numero": factura or None,
                        "notas_internas": notas or None,
                    }).execute()
                    lic_id = lic.data[0]["id"]

                    # 4. Registrar evento
                    sb.table("eventos_licencia").insert({
                        "licencia_id": lic_id,
                        "tipo": "emision",
                        "detalle": {"plan": plan, "duracion_meses": duracion}
                    }).execute()

                    # 5. Obtener datos del plan
                    plan_data = sb.table("planes").select("*").eq("id", plan).single().execute().data

                    # 6. Enviar email si se solicitó
                    if enviar_email:
                        email_result = send_email(
                            template="bienvenida",
                            to_email=cliente["contacto_email"],
                            to_name=cliente.get("contacto_nombre") or cliente["razon_social"],
                            data={
                                "plan": plan.capitalize(),
                                "email": cliente["contacto_email"],
                                "password_temporal": password_temp,
                                "max_skus": plan_data["max_skus"],
                                "max_dispositivos": plan_data["max_dispositivos"],
                                "fecha_expiracion": format_fecha(str(fecha_exp)),
                            },
                            jwt_token=st.session_state.get("jwt","")
                        )
                        if email_result.get("ok"):
                            st.success(f"✅ Licencia emitida y email enviado a {cliente['contacto_email']}")
                        else:
                            st.warning(f"⚠️ Licencia creada pero el email falló: {email_result.get('error')}")
                    else:
                        st.success(f"✅ Licencia emitida. ID: {lic_id[:8]}...")

                    st.info(f"Contraseña temporal: **{password_temp}**")
                    st.rerun()

                except Exception as e:
                    err_msg = str(e)
                    if "User not allowed" in err_msg or "not_admin" in err_msg or "User not found" in err_msg:
                        st.error(
                            "❌ Permisos insuficientes para crear usuarios.\n\n"
                            "**Causa probable**: el `SUPABASE_SERVICE_ROLE_KEY` configurado en "
                            "Streamlit Cloud → Settings → Secrets no es el correcto "
                            "(podría estar usando el ANON_KEY en su lugar).\n\n"
                            "**Solución**: verifica que el valor de `SUPABASE_SERVICE_ROLE_KEY` "
                            "en los secrets coincida con el que ves en Supabase Dashboard → "
                            "Project Settings → API → `service_role` key (NO el `anon` key)."
                        )
                        # Diagnóstico no-secreto: decodificar el role del JWT actualmente activo
                        try:
                            import base64, json
                            payload_b64 = SUPABASE_KEY.split(".")[1]
                            payload_b64 += "=" * (-len(payload_b64) % 4)
                            payload = json.loads(base64.urlsafe_b64decode(payload_b64))
                            current_role = payload.get("role", "desconocido")
                            st.warning(f"🔍 Diagnóstico: el cliente Supabase está usando rol `{current_role}` (debería ser `service_role`).")
                        except Exception:
                            pass
                    elif "already registered" in err_msg.lower() or "already exists" in err_msg.lower() or "duplicate" in err_msg.lower():
                        st.error(
                            f"❌ El email **{cliente['contacto_email']}** ya tiene un usuario en Supabase Auth.\n\n"
                            "Opciones:\n"
                            "- Usa otro email\n"
                            "- O elimina el usuario existente desde Supabase Dashboard → Authentication → Users"
                        )
                    else:
                        st.error(f"❌ Error al emitir licencia: {err_msg[:300]}")

# ── SECCIÓN: ACTIVACIONES ─────────────────────────────────────

def seccion_activaciones():
    sb = get_supabase()
    st.markdown("# 📱 Activaciones")
    st.markdown("Monitorea activaciones por licencia y dispositivo")

    result = sb.table("activaciones").select(
        "*, licencias(plan_id, clientes(razon_social))"
    ).order("last_seen", desc=True).execute()
    activaciones = result.data or []

    col1, col2 = st.columns(2)
    with col1:
        solo_activas = st.checkbox("Solo activas", value=True)
    if solo_activas:
        activaciones = [a for a in activaciones if a.get("activa")]

    if activaciones:
        rows = []
        for a in activaciones:
            lic = a.get("licencias") or {}
            cli = lic.get("clientes") or {}
            rows.append({
                "Cliente": cli.get("razon_social","—"),
                "Plan": lic.get("plan_id","—").capitalize(),
                "Fingerprint": (a.get("fingerprint") or "")[:12] + "...",
                "User Agent": (a.get("user_agent") or "")[:40],
                "IP": str(a.get("ip_last") or a.get("ip_first") or "—"),
                "Último acceso": format_fecha(a.get("last_seen")),
                "Activa": "✅" if a.get("activa") else "❌",
            })
        df = pd.DataFrame(rows)
        st.dataframe(df, use_container_width=True, hide_index=True)
        st.caption(f"{len(rows)} activación(es)")
    else:
        st.info("No hay activaciones registradas aún.")

# ── SECCIÓN: MÉTRICAS ─────────────────────────────────────────

def seccion_metricas():
    sb = get_supabase()
    st.markdown("# 📊 Métricas")
    st.markdown("Dashboard de licencias y revenue")
    st.markdown("")

    lics = sb.table("licencias").select("estado, plan_id, precio_pagado_clp, fecha_expiracion").execute().data or []

    activas    = [l for l in lics if l["estado"] == "activa"]
    expiradas  = [l for l in lics if l["estado"] == "expirada"]
    suspendidas = [l for l in lics if l["estado"] == "suspendida"]

    mrr_equiv = sum((l.get("precio_pagado_clp") or 0) / 12 for l in activas)

    # Tarjetas de métricas
    col1, col2, col3, col4 = st.columns(4, gap="small")

    with col1:
        st.markdown("""
        <div class="metric-card">
            <div class="metric-label">💚 Licencias Activas</div>
            <div class="metric-value">""" + str(len(activas)) + """</div>
        </div>
        """, unsafe_allow_html=True)

    with col2:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">💰 MRR Equivalente</div>
            <div class="metric-value">${mrr_equiv:,.0f}</div>
        </div>
        """, unsafe_allow_html=True)

    with col3:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">⏰ Expiradas</div>
            <div class="metric-value">{len(expiradas)}</div>
        </div>
        """, unsafe_allow_html=True)

    with col4:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">⏸️ Suspendidas</div>
            <div class="metric-value">{len(suspendidas)}</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("")
    st.markdown("---")

    # Distribución por plan
    if activas:
        planes_count = {}
        for l in activas:
            p = l["plan_id"].capitalize()
            planes_count[p] = planes_count.get(p, 0) + 1
        df_planes = pd.DataFrame(list(planes_count.items()), columns=["Plan","Licencias activas"])
        st.subheader("Distribución por plan")
        st.dataframe(df_planes, use_container_width=True, hide_index=True)

    # Próximas a vencer (30 días)
    hoy = date.today()
    proximas = [l for l in activas if l.get("fecha_expiracion") and
                date.fromisoformat(str(l["fecha_expiracion"])[:10]) <= hoy + timedelta(days=30)]
    if proximas:
        st.subheader(f"⚠️ Próximas a vencer ({len(proximas)})")
        df_prox = pd.DataFrame([{
            "Plan": l["plan_id"].capitalize(),
            "Vence": format_fecha(l["fecha_expiracion"]),
        } for l in proximas])
        st.dataframe(df_prox, use_container_width=True, hide_index=True)

# ── MAIN ──────────────────────────────────────────────────────

def main():
    if not st.session_state.get("authenticated"):
        login_page()
        return

    # Sidebar
    with st.sidebar:
        st.markdown("""
        <div style="text-align: center; padding: 16px 0; margin-bottom: 24px;">
            <p style="font-size: 20px; font-weight: 900; color: #00B4D8; margin: 0;">IHC <span style="color: #E2E8F0;">Tool™</span></p>
            <p style="font-size: 11px; color: #64748B; margin-top: 4px; letter-spacing: 0.5px; text-transform: uppercase;">Admin Panel</p>
        </div>
        """, unsafe_allow_html=True)

        st.markdown(f"""
        <div style="background: rgba(0, 180, 216, 0.1); border: 1px solid rgba(0, 180, 216, 0.2); border-radius: 8px; padding: 12px; text-align: center; margin-bottom: 24px;">
            <p style="font-size: 12px; color: #94A3B8; margin: 0; margin-bottom: 4px;">Administrador</p>
            <p style="font-size: 13px; color: #00B4D8; margin: 0; font-weight: 600; word-break: break-all;">{st.session_state.get('user_email','')}</p>
        </div>
        """, unsafe_allow_html=True)

        st.markdown("---")
        st.markdown("### 🗂️ Navegación")

        # Navegación con botones nativos (inmune al problema de textColor del tema)
        if "seccion_actual" not in st.session_state:
            st.session_state["seccion_actual"] = "📊 Métricas"

        opciones_nav = [
            "📊 Métricas",
            "👥 Clientes",
            "🔑 Licencias",
            "📱 Activaciones",
        ]
        for opcion in opciones_nav:
            es_activa = st.session_state["seccion_actual"] == opcion
            if st.button(
                opcion,
                key=f"nav_{opcion}",
                use_container_width=True,
                type="primary" if es_activa else "secondary",
            ):
                st.session_state["seccion_actual"] = opcion
                st.rerun()

        seccion = st.session_state["seccion_actual"]

        st.markdown("---")

        col1, col2 = st.columns([1, 1], gap="small")
        with col1:
            if st.button("🚪 Cerrar sesión", use_container_width=True):
                st.session_state.clear()
                st.rerun()
        with col2:
            if st.button("ℹ️ Ayuda", use_container_width=True):
                st.info("Contacta a contacto@tyradvisor.com para soporte.")

    if seccion == "📊 Métricas":    seccion_metricas()
    elif seccion == "👥 Clientes":  seccion_clientes()
    elif seccion == "🔑 Licencias": seccion_licencias()
    elif seccion == "📱 Activaciones": seccion_activaciones()

if __name__ == "__main__":
    main()
