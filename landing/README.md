# IHC Tool™ — Landing page

Sitio estático (HTML/CSS) que vive en `tyradvisor.com/ihc-tool/`.
Sin build step, sin framework. Cualquier editor de texto sirve para iterar.

## Estructura

```
landing/
├── index.html      Una sola página con todas las secciones
├── styles.css      CSS con variables para colores y responsive
├── netlify.toml    Headers de seguridad + cache
└── README.md       Este archivo
```

## Preview local

Abre `index.html` con doble click (lo hostea tu navegador desde `file://`).
Funciona casi todo; los únicos detalles que requieren servidor:
- Submit del form (Netlify Forms necesita estar deployado)
- Smooth scroll de anchors en algunos navegadores

Para ver con un servidor local rápido:

```powershell
cd landing
python -m http.server 8000
# Navega a http://localhost:8000
```

## Deploy en Netlify

### Opción A: drag-and-drop (más rápido, 2 min)

1. Comprimir la carpeta `landing/` en un .zip
2. Ir a https://app.netlify.com/drop
3. Arrastrar el .zip → Netlify lo monta automáticamente
4. Te asigna una URL tipo `https://nombre-random.netlify.app`
5. Más adelante conectas el repo para auto-deploy.

### Opción B: conectar el repo GitHub (recomendado, 5 min)

1. Login en https://app.netlify.com/
2. **Add new site → Import an existing project**
3. Conectar GitHub → seleccionar `Tyradvisor/ihc-tool-commercial`
4. **Base directory**: `landing`
5. **Build command**: (vacío)
6. **Publish directory**: `landing`
7. Deploy → en ~30s tienes la URL `https://*.netlify.app`

Cada push a `main` re-deploya automáticamente.

## Dominio personalizado

Una vez Netlify te dé la URL provisional:

1. Netlify dashboard → **Domain settings → Add custom domain**
2. Ingresar `tyradvisor.com`
3. Netlify te dirá qué configurar en tu DNS:
   - **Si tyradvisor.com lo manejas vía nameservers externos** (Cloudflare, GoDaddy, etc.): agrega un registro CNAME o A según indique Netlify
   - **Subpath /ihc-tool**: requiere configuración adicional. Si la web actual de tyradvisor.com está en otro host, hay 3 caminos:
     a) Mover toda tyradvisor.com a Netlify (ideal si la web actual está vieja)
     b) Configurar redirect/proxy en el host actual: `tyradvisor.com/ihc-tool` → Netlify
     c) Usar subdominio `ihc.tyradvisor.com` en su lugar (más simple, requiere solo un CNAME)

**SSL**: Netlify provisiona Let's Encrypt automáticamente apenas el DNS apunte correctamente. ~5-10 min.

## Form de contacto (Netlify Forms)

El form en `index.html` lleva `data-netlify="true"` y un honeypot anti-spam.
**Necesita estar deployado en Netlify para funcionar** — en local no captura.

Una vez deployado:

1. Netlify dashboard → **Forms** → verás "contact"
2. **Notifications** → agregar email destinatario (`contacto@tyradvisor.com`)
3. Cada submission queda guardada en Netlify (también) + se envía por email

**Anti-spam**: ya hay honeypot básico. Si llega spam, activar reCAPTCHA invisible
desde la configuración del form (Netlify lo integra en 1 click).

## Personalización rápida

### Cambiar colores

Editar las variables CSS al inicio de `styles.css`:

```css
:root {
  --navy:   #0A1628;   /* fondo oscuro, headers */
  --cyan:   #00B4D8;   /* acento marca */
  /* … */
}
```

### Cambiar copy

Cada sección es un `<section>` con clase descriptiva (`.hero`, `.problema`,
`.solucion`, …) — fácil de encontrar con Ctrl+F en `index.html`.

### Cambiar planes y precios

Buscar `<!-- PLANES -->` en `index.html`. Cada plan está dentro de un
`<div class="plan-card">`.

### Agregar testimonios / logos

Sugerido insertarlo entre las secciones **Privacidad** y **Planes** como nueva
`<section class="testimonios">`. Cuando tengas el contenido te lo agrego.

## Próximos pasos sugeridos

- [ ] Capturar screenshot real del dashboard para reemplazar el placeholder del hero
- [ ] Convertir `docs/legal/PRIVACIDAD.md` y `TERMINOS.md` a HTML, publicarlos en
      `landing/legal/privacidad.html` y `landing/legal/terminos.html`
- [ ] Agregar logos de clientes / testimonios cuando los tengas
- [ ] Configurar analytics (sugerido: Plausible o GA4)
- [ ] Sitemap.xml + robots.txt
- [ ] og:image (1200×630) para previews en redes sociales
