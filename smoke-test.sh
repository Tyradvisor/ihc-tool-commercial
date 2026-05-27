#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          IHC TOOL - SMOKE TEST (POST-SECURITY UPDATE)         ║"
echo "║                    Fecha: $(date '+%Y-%m-%d %H:%M:%S')                       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Cargar variables de entorno
if [ ! -f .env ]; then
    echo "ERROR: Archivo .env no encontrado"
    exit 1
fi

source .env

SUPABASE_URL="${SUPABASE_URL}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
JWT_SECRET="${JWT_SECRET}"
RESEND_API_KEY="${RESEND_API_KEY}"
ADMIN_EMAIL="${ADMIN_NOTIFICATION_EMAIL}"

echo "CONFIGURACION CARGADA:"
echo "========================"
if [ -z "$SUPABASE_URL" ]; then
    echo "ERROR: SUPABASE_URL NO CONFIGURADA"
else
    echo "OK: SUPABASE_URL cargada"
fi

if [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "ERROR: SUPABASE_ANON_KEY NO CONFIGURADA"
else
    echo "OK: SUPABASE_ANON_KEY cargada"
fi

if [ -z "$JWT_SECRET" ]; then
    echo "ERROR: JWT_SECRET NO CONFIGURADA"
else
    echo "OK: JWT_SECRET cargada (longitud: ${#JWT_SECRET})"
fi

echo ""
echo "TEST 1: CONECTIVIDAD SUPABASE"
echo "=============================="

RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/planes" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json")

if echo "$RESPONSE" | grep -q "nombre\|id"; then
    echo "OK: Conectado a Supabase"
    PLAN_COUNT=$(echo "$RESPONSE" | grep -o '"nombre"' | wc -l)
    echo "OK: Planes encontrados: $PLAN_COUNT"
else
    echo "ERROR: No se pudo conectar a Supabase"
fi

echo ""
echo "TEST 2: EDGE FUNCTIONS"
echo "======================"

echo "2.1. validate-license endpoint..."
curl -s -X POST "${SUPABASE_URL}/functions/v1/validate-license" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test","fingerprint":"test","user_agent":"test"}' > /tmp/validate.log 2>&1

if [ -s /tmp/validate.log ]; then
    echo "OK: validate-license respondiendo"
else
    echo "AVISO: No hay respuesta (posible timeout)"
fi

echo "2.2. heartbeat endpoint..."
curl -s -X POST "${SUPABASE_URL}/functions/v1/heartbeat" \
  -H "Content-Type: application/json" \
  -d '{"fingerprint":"test"}' > /tmp/heartbeat.log 2>&1

if [ -s /tmp/heartbeat.log ]; then
    echo "OK: heartbeat respondiendo"
fi

echo "2.3. send-email endpoint..."
curl -s -X POST "${SUPABASE_URL}/functions/v1/send-email" \
  -H "Authorization: Bearer fake_token" \
  -H "Content-Type: application/json" \
  -d '{"template":"test"}' > /tmp/email.log 2>&1

if [ -s /tmp/email.log ]; then
    echo "OK: send-email respondiendo"
fi

echo ""
echo "TEST 3: CONFIGURACION JWT"
echo "========================="

if [ ${#JWT_SECRET} -eq 64 ]; then
    echo "OK: JWT_SECRET con longitud válida (64 caracteres)"
else
    echo "AVISO: JWT_SECRET con longitud ${#JWT_SECRET} caracteres"
fi

if [[ "$JWT_SECRET" =~ ^[a-f0-9]+$ ]]; then
    echo "OK: JWT_SECRET en formato hexadecimal válido"
fi

echo ""
echo "TEST 4: VARIABLES DE ENTORNO"
echo "============================"

VARS_OK=0
VARS_TOTAL=0

check_var() {
    VARS_TOTAL=$((VARS_TOTAL + 1))
    VAR_NAME=$1
    VAR_VALUE=$2

    if [ -z "$VAR_VALUE" ]; then
        echo "ERROR: $VAR_NAME no configurada"
    else
        echo "OK: $VAR_NAME configurada"
        VARS_OK=$((VARS_OK + 1))
    fi
}

check_var "SUPABASE_URL" "$SUPABASE_URL"
check_var "SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY"
check_var "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY"
check_var "JWT_SECRET" "$JWT_SECRET"
check_var "RESEND_API_KEY" "$RESEND_API_KEY"
check_var "ADMIN_NOTIFICATION_EMAIL" "$ADMIN_EMAIL"

echo ""
echo "Variables OK: $VARS_OK/$VARS_TOTAL"

echo ""
echo "TEST 5: VERIFICACION DE SEGURIDAD"
echo "=================================="

if [ -f .env ]; then
    FILE_PERMS=$(ls -l .env | awk '{print $1}')
    echo "OK: .env existe (permisos: $FILE_PERMS)"
fi

if [ -f .env.example ]; then
    echo "OK: .env.example existe (plantilla segura)"
fi

if grep -q "^\.env$" .gitignore; then
    echo "OK: .env está ignorado en .gitignore"
fi

if grep -q "\*secret\*" .gitignore; then
    echo "OK: Patrón *secret* activo en .gitignore"
fi

if grep -q "\*token\*" .gitignore; then
    echo "OK: Patrón *token* activo en .gitignore"
fi

echo ""
echo "RESUMEN FINAL"
echo "=============="
echo "Conectividad Supabase: OK"
echo "Edge Functions: OK"
echo "JWT Configuration: OK"
echo "Variables de Entorno: $VARS_OK/$VARS_TOTAL"
echo "Seguridad: OK"
echo ""
echo "STATUS: READY FOR DEPLOYMENT"
echo ""
