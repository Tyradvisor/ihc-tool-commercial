# Política de Privacidad — IHC Tool™

**Última actualización**: 28 de mayo de 2026
**Versión**: 1.0

> ⚖️ **Borrador legal — pendiente revisión por abogado/a antes de publicación**.
> Reemplaza también los marcadores `[REVISAR]` con datos verificados.

---

## 1. Identificación del Responsable

El responsable del tratamiento de datos personales es:

- **Razón social**: TyrAdvisor SpA
- **RUT**: 78.192.245-5
- **Domicilio**: Antonio Bellet 193, Of. 1210, Providencia, Santiago, Chile
- **Email de contacto**: contacto@tyradvisor.com
- **Responsable de protección de datos**: [REVISAR — nombrar persona o dejar mismo email]

## 2. Datos personales que tratamos

Al usar IHC Tool™ podemos recolectar y procesar los siguientes datos:

### 2.1 Datos que entregas directamente
- Email corporativo del usuario titular de la licencia
- Nombre y razón social de la empresa
- RUT empresarial (opcional)
- Nombre, email y teléfono del contacto principal (opcional)
- Industria/sector (opcional)
- Información de facturación (cuando corresponda)

### 2.2 Datos que recolectamos automáticamente
- Dirección IP del dispositivo desde el que accedes
- Identificador técnico del navegador (user agent)
- "Huella digital" (fingerprint) del dispositivo, construida a partir de características técnicas (zona horaria, tamaño de pantalla, lenguaje, renderizado de canvas). Se usa exclusivamente para limitar la cantidad de dispositivos permitidos por licencia.
- Fecha y hora de inicio de sesión y de los heartbeats periódicos
- Eventos de la licencia: emisión, suspensión, reactivación, revocación

### 2.3 Datos que **NO** recolectamos
Los archivos de inventario que cargas en la herramienta (planillas Excel, datos de SKUs, valores monetarios, conteos físicos) **se procesan exclusivamente en tu propio navegador**. No se transmiten ni se almacenan en nuestros servidores. Esa información nunca sale de tu computador.

## 3. Finalidades del tratamiento

Usamos tus datos personales para:

1. **Prestar el servicio**: validar tu licencia, autenticar tu acceso, garantizar el límite de dispositivos contratados.
2. **Soporte y comunicación**: responder consultas, enviar notificaciones operativas (bienvenida, vencimiento, suspensión).
3. **Seguridad**: detectar y prevenir accesos no autorizados, intentos de fraude, abuso del servicio.
4. **Cumplimiento contractual y legal**: facturación, evidencia de aceptación de términos, auditoría.
5. **Mejora del servicio**: estadísticas agregadas y anónimas de uso (no se vincula a usuarios individuales).

**No usamos tus datos para perfilamiento publicitario ni los vendemos a terceros.**

## 4. Base legal del tratamiento (Ley 19.628)

- **Ejecución del contrato**: prestar el servicio para el que contrataste.
- **Interés legítimo**: seguridad, prevención de fraude, mejoras del producto.
- **Cumplimiento legal**: emisión de boletas/facturas, retención fiscal.
- **Consentimiento**: cuando aplica (por ejemplo, comunicaciones no operativas opcionales).

## 5. Conservación

Conservamos tus datos mientras tu licencia esté activa y por **5 años adicionales** después de su terminación, plazo que corresponde a obligaciones tributarias y de prescripción de eventuales acciones legales. Los eventos de auditoría se conservan por hasta **2 años**. Pasados estos plazos, los datos se eliminan o anonimizan irreversiblemente.

## 6. Destinatarios y encargados del tratamiento

Para prestar el servicio compartimos datos con los siguientes proveedores, todos sujetos a obligaciones contractuales de confidencialidad y seguridad:

| Proveedor | Función | Ubicación | Datos compartidos |
|-----------|---------|-----------|-------------------|
| Supabase Inc. | Base de datos, autenticación, funciones backend | Estados Unidos | Todos los datos del titular y de la licencia |
| Resend | Envío de correos electrónicos transaccionales | Estados Unidos | Email, nombre, contenido del correo |
| Streamlit Inc. | Hosting del panel administrativo de TyrAdvisor | Estados Unidos | Acceso indirecto (sólo TyrAdvisor admin) |
| Sentry | Monitoreo de errores | Estados Unidos | Trazas técnicas (sin contenido sensible) |

**Transferencia internacional**: estos servicios operan desde Estados Unidos. Las transferencias se realizan bajo cláusulas contractuales estándar que garantizan un nivel de protección equivalente a la normativa chilena.

## 7. Derechos del titular

Como titular de los datos tienes derecho a:

- **Acceso**: solicitar copia de los datos que tenemos sobre ti.
- **Rectificación**: corregir datos inexactos o desactualizados.
- **Cancelación**: solicitar la eliminación de tus datos (sujeto a obligaciones legales de conservación).
- **Oposición**: oponerte a tratamientos basados en interés legítimo.
- **Portabilidad**: recibir tus datos en formato estructurado.

Para ejercer cualquiera de estos derechos escríbenos a **contacto@tyradvisor.com** desde el email con el que se emitió la licencia. Responderemos dentro de los **15 días hábiles** siguientes a tu solicitud.

Si consideras que no atendimos adecuadamente tu solicitud puedes reclamar ante la **Agencia de Protección de Datos Personales** correspondiente (referencia: Ley 19.628 actualizada por Ley 21.719 sobre Protección de Datos Personales — [REVISAR vigencia]).

## 8. Cookies y almacenamiento local

IHC Tool™ utiliza el almacenamiento local (`localStorage`) de tu navegador para:

- **Token de licencia** (`ihc_license_token`): permite reconectarte sin volver a ingresar credenciales y soporta el modo offline de hasta 7 días.
- **Huella de dispositivo** (`ihc_device_fp`): identifica este equipo para el conteo de dispositivos activados.
- **Email del usuario** (`ihc_user_email`): para facilitar el flujo de cambio de contraseña.

No usamos cookies de terceros con fines publicitarios o de seguimiento entre sitios. Puedes borrar el almacenamiento local en cualquier momento desde la configuración de tu navegador; esto equivale a cerrar sesión.

## 9. Seguridad

Implementamos las siguientes medidas (no exhaustivo):

- Cifrado en tránsito (HTTPS / TLS 1.2+) en todas las comunicaciones.
- Cifrado en reposo de bases de datos por parte del proveedor (Supabase).
- Aislamiento de datos por cliente mediante Row-Level Security a nivel de base de datos.
- Autenticación con contraseñas de alta entropía generadas automáticamente y JWT firmados.
- Limitación de intentos de acceso (rate limiting) y registro de actividad sospechosa.
- Acceso interno restringido por roles y validación reiterativa.
- Rotación regular de credenciales sensibles.

Ningún sistema es invulnerable. En caso de un incidente de seguridad que pueda afectarte, te informaremos sin dilación indebida y con las precauciones que la normativa exige.

## 10. Menores de edad

IHC Tool™ es un producto B2B (empresa a empresa). No está dirigido a personas menores de 18 años y no recolectamos conscientemente datos de menores.

## 11. Cambios a esta política

Podemos actualizar esta política para reflejar cambios legales, técnicos o de prácticas de negocio. La fecha de "Última actualización" se modificará en la parte superior. Cambios sustanciales serán comunicados por email a los titulares de licencia.

## 12. Contacto

Para cualquier consulta sobre el tratamiento de tus datos:

📧 **contacto@tyradvisor.com**
🏢 TyrAdvisor SpA, Antonio Bellet 193, Of. 1210, Providencia, Santiago, Chile
