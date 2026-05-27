# IHC Tool Commercial - API Contracts

Documentación técnica de los endpoints de validación de licencias para IHC Tool Commercial.

---

## 1. Validate License Endpoint

**Descripción:**
Autentica un usuario, valida su licencia, verifica límites de dispositivos y emite un JWT firmado válido por el período de offline del plan.

**URL:**
```
https://ikdrnispjakjaxqwzhaf.supabase.co/functions/v1/validate-license
```

**Método:** `POST`

**Headers Requeridos:**
```
Content-Type: application/json
apikey: <ANON-KEY>
```

**Request Body:**
```typescript
{
  email: string;           // Email del usuario registrado en Supabase Auth
  password: string;        // Contraseña del usuario
  fingerprint: string;     // Hash único del dispositivo (ej: UUID v5 o SHA256)
  user_agent: string;      // User-Agent del cliente (ej: navegador, app, versión)
}
```

**Respuesta 200 (Éxito):**
```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLWlkIiwibGljZW5jaWFfaWQiOiJsaWMtaWQiLCJwbGFuIjoicGxhbi1pZCIsImZlYXR1cmVfZmxhZ3MiOnsiZm9vIjp0cnVlfSwibWF4X3NrdXMiOjUwMDAwLCJmaW5nZXJwcmludCI6ImFiYzEyMyIsImV4cCI6MTcxNzYwMDAwMCwiaWF0IjoxNzE3NTAwMDAwLCJpc3MiOiJpaGMtdHlyYWR2aXNvciJ9.signature",
  "plan": "pro",
  "feature_flags": {
    "export_xlsx": true,
    "causas_raiz": true
  },
  "max_skus": 50000,
  "max_dispositivos": 3,
  "dispositivos_usados": 1,
  "fecha_expiracion": "2026-12-31",
  "dias_offline_permitidos": 30,
  "cliente": {
    "razon_social": "Acme Corp S.A.",
    "logo_url": null
  }
}
```

**Códigos de Error:**

| Código | Status | Descripción |
|--------|--------|-------------|
| `RATE_LIMITED` | 429 | Demasiados intentos de login fallidos. Máx 5 en 5 minutos por IP. |
| `MISSING_FIELDS` | 400 | Faltan campos requeridos (email, password, fingerprint). |
| `INVALID_CREDENTIALS` | 401 | Email o contraseña incorrectos. |
| `NO_LICENSE` | 403 | El usuario no tiene licencia asignada. |
| `LICENSE_SUSPENDED` | 403 | La licencia está suspendida temporalmente. |
| `LICENSE_REVOKED` | 403 | La licencia fue revocada. |
| `LICENSE_EXPIRED` | 403 | La licencia ha expirado. |
| `DEVICE_LIMIT_REACHED` | 403 | Se alcanzó el límite de dispositivos del plan. |
| `INTERNAL_ERROR` | 500 | Error interno del servidor. |

**Ejemplo CURL:**
```bash
curl -X POST \
  https://ikdrnispjakjaxqwzhaf.supabase.co/functions/v1/validate-license \
  -H "Content-Type: application/json" \
  -H "apikey: <ANON-KEY>" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "fingerprint": "550e8400-e29b-41d4-a716-446655440000",
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
  }'
```

**Notas:**
- El JWT tiene validez según `dias_offline_permitidos` del plan (típicamente 7-30 días)
- El fingerprint debe ser único y consistente por dispositivo
- Cada activación de dispositivo se registra con IP y User-Agent
- Los eventos de login fallidos se registran en `eventos_licencia`

---

## 2. Heartbeat Endpoint

**Descripción:**
Valida un JWT existente, verifica que la licencia siga activa, actualiza el timestamp de última actividad del dispositivo y emite un nuevo JWT renovado.

**URL:**
```
https://ikdrnispjakjaxqwzhaf.supabase.co/functions/v1/heartbeat
```

**Método:** `POST`

**Headers Requeridos:**
```
Content-Type: application/json
Authorization: Bearer <JWT-TOKEN>
```

**Request Body:**
```typescript
{
  fingerprint: string;  // Mismo fingerprint usado en validate-license
}
```

**Respuesta 200 (Éxito):**
```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLWlkIiwibGljZW5jaWFfaWQiOiJsaWMtaWQiLCJwbGFuIjoicGxhbi1pZCIsImZlYXR1cmVfZmxhZ3MiOnsiZm9vIjp0cnVlfSwibWF4X3NrdXMiOjEwMDAsImZpbmdlcnByaW50IjoiYWJjMTIzIiwiZXhwIjoxNzE3NjAwMDAwLCJpYXQiOjE3MTc1MDAwMDAsImlzcyI6ImloYy10eXJhZHZpc29yIn0.signature",
  "fecha_expiracion": "2026-12-31"
}
```

**Códigos de Error:**

| Código | Status | Descripción |
|--------|--------|-------------|
| `NO_TOKEN` | 401 | Header Authorization no proporcionado o formato inválido (debe ser `Bearer <token>`). |
| `INVALID_TOKEN` | 401 | JWT no válido, expirado, o no puede ser verificado. |
| `LICENSE_NOT_FOUND` | 403 | No existe licencia para el usuario. |
| `LICENSE_REVOKED` | 403 | La licencia fue revocada. |
| `LICENSE_SUSPENDED` | 403 | La licencia está suspendida. |
| `LICENSE_EXPIRED` | 403 | La licencia ha expirado. |
| `INTERNAL_ERROR` | 500 | Error interno del servidor. |

**Ejemplo CURL:**
```bash
curl -X POST \
  https://ikdrnispjakjaxqwzhaf.supabase.co/functions/v1/heartbeat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLWlkIiwibGljZW5jaWFfaWQiOiJsaWMtaWQifQ.signature" \
  -d '{
    "fingerprint": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Notas:**
- Este endpoint debe ser llamado periódicamente (recomendado cada 24 horas)
- El nuevo JWT tiene la misma validez que el anterior (renovación de expiration)
- La activación del dispositivo se actualiza con `last_seen` y `ip_last`
- El fingerprint debe coincidir con el usado originalmente en validate-license

---

## JWT Payload Structure

Ambos endpoints emiten JWTs con la siguiente estructura:

```typescript
{
  sub: string;              // User ID de Supabase Auth
  licencia_id: string;      // ID de la licencia
  plan: string;             // ID del plan
  feature_flags: object;    // Banderas de funcionalidades habilitadas
  max_skus: number;         // Máximo de SKUs permitidos
  fingerprint: string;      // Fingerprint del dispositivo
  exp: number;              // Timestamp de expiración (segundos)
  iat: number;              // Timestamp de emisión (segundos)
  iss: string;              // Emisor ("ihc-tyradvisor")
}
```

**Algoritmo:** HS256 (HMAC-SHA256)
**Secreto:** JWT_SECRET (256 bits)

---

## Flujo de Autenticación

1. **Cliente** → POST `/validate-license` con email/password
2. **API** → Valida credenciales y licencia, emite JWT
3. **Cliente** → Almacena JWT localmente (localStorage, sessionStorage, etc)
4. **Cliente** → Usa JWT en header `Authorization: Bearer <token>` para peticiones autenticadas
5. **Cliente** → Cada 24h (o antes de expiración) → POST `/heartbeat` para renovar JWT
6. **API** → Verifica JWT, valida licencia, emite nuevo JWT con expiration renovada

---

## Consideraciones de Seguridad

- **Rate Limiting:** 5 intentos fallidos máximo por IP cada 5 minutos en `/validate-license`
- **JWT Expiration:** Válido por `dias_offline_permitidos` del plan (no persiste por red)
- **Device Fingerprinting:** Debe ser único y estable por dispositivo
- **CORS:** Habilitado con `Access-Control-Allow-Origin: *` (permitir cualquier origen)
- **Secrets:** JWT_SECRET y RESEND_API_KEY almacenados en Supabase Secrets (no en el código)

---

## Debugging

Para inspeccionar un JWT:
```bash
# Decodificar JWT (sin verificar firma)
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." | cut -d. -f2 | base64 -d | jq .

# O usar https://jwt.io (solo para desarrollo, nunca con tokens reales)
```

---

**Versión:** 1.0  
**Última actualización:** 2026-05-25  
**Estado:** En Desarrollo (Sprint 1)
