# Documentación legal — IHC Tool™

Esta carpeta contiene los borradores de los documentos legales requeridos
para operar el producto en producción con usuarios reales.

## Archivos

| Documento | Estado | Próximo paso |
|-----------|--------|--------------|
| [`PRIVACIDAD.md`](./PRIVACIDAD.md) | 🟡 Borrador | Revisar con abogado/a + publicar |
| [`TERMINOS.md`](./TERMINOS.md) | 🟡 Borrador | Revisar con abogado/a + publicar |

## Marcadores `[REVISAR]`

Los borradores contienen marcadores `[REVISAR]` en los puntos que dependen de
una verificación legal o de información que sólo TyrAdvisor puede confirmar:

- Vigencia exacta de la Ley 21.719 (modifica la 19.628 sobre protección de datos)
- Nombre del Delegado de Protección de Datos (DPO) si aplica
- Datos exactos de domicilio si han cambiado
- Plazos específicos de conservación según práctica tributaria de TyrAdvisor

Reemplaza cada `[REVISAR]` con su valor definitivo antes de publicar.

## Publicación

Una vez aprobados, los documentos deben:

1. **Convertirse a HTML/PDF** para que sean navegables sin clonar el repo. Sugerido:
   - HTML estático servido desde la landing (Netlify/Vercel/CloudFront)
   - PDF descargable como respaldo

2. **Enlazarse desde**:
   - El overlay de login del frontend (`client/license.js`), reemplazando la
     mención actual a `tycCheck` con un link real
   - El footer del email de bienvenida (`supabase/functions/send-email/index.ts`)
   - El menú "Mi Cuenta" del frontend
   - La landing/sitio web público

3. **Almacenar versiones**: cuando cambien, guardar las versiones anteriores con
   fecha de vigencia. Algunas obligaciones piden poder demostrar cuál era la
   versión vigente al momento del consentimiento del usuario.

## Revisión periódica

Recomendado: revisar estos documentos cada 12 meses o cuando ocurra:
- Cambio en la legislación de protección de datos
- Cambio de proveedores (Supabase, Resend, etc.)
- Cambio en el modelo comercial (planes, precios, vigencias)
- Incidente de seguridad relevante
