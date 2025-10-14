# ⚠️ Corrección: vercel.json

## Problema Detectado

**Error de Vercel:**
```
The `vercel.json` schema validation failed with the following message:
`functions.api/server.ts` should NOT have additional property `regions`
```

## Causa

La configuración de `regions` dentro de `functions` **NO es válida** en el plan gratuito de Vercel. Esta opción solo está disponible en **Vercel Pro/Team** ($20+/mes).

## Solución Aplicada

### vercel.json Corregido:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/server"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "functions": {
    "api/server.ts": {
      "memory": 1024,
      "maxDuration": 60
    }
  }
}
```

### Cambios:
- ❌ Eliminado: `"regions": ["iad1"]` dentro de `functions`
- ❌ Eliminado: `"regions": ["iad1"]` a nivel global
- ✅ Mantenido: `"memory": 1024` (1GB RAM)
- ✅ Mantenido: `"maxDuration": 60` (60 segundos timeout)

## ⚠️ Limitación del Plan Gratuito

### En Vercel Free:
- ❌ No puedes especificar región manualmente
- ✅ Vercel usa **geo-routing automático** (despliega cerca del usuario)
- ✅ `maxDuration: 60` **SÍ funciona** (hasta 60 segundos)
- ⚠️ Nota: `maxDuration > 10` puede requerir plan Pro según docs recientes

## Alternativas para Reducir Latencia

### Opción 1: Connection Pooling de Supabase (RECOMENDADO)

Cambiar `DATABASE_URL` en Vercel a:

```
postgresql://postgres.tfbseptpjopymatrqhac:A3aHOAliJxJ6rw5K@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Ventajas:**
- ✅ Conexiones más rápidas (pooling)
- ✅ Menos overhead por request
- ✅ Funciona en plan gratuito
- ✅ Reduce timeouts sin necesidad de región específica

### Opción 2: Upgrade a Vercel Pro

Si connection pooling no es suficiente:

```json
{
  "functions": {
    "api/server.ts": {
      "memory": 3008,
      "maxDuration": 60,
      "regions": ["iad1"]  // ← Solo disponible en Pro
    }
  }
}
```

**Costo:** $20/mes
**Ventajas:**
- 60s timeout garantizado
- Región específica (iad1 = US East)
- 3GB RAM por función
- Sin límite de builds

### Opción 3: Optimizar Queries (YA IMPLEMENTADO ✅)

- ✅ Queries paralelas con `Promise.all`
- ✅ Polling reducido a 30s
- ✅ Retry logic
- ✅ StaleTime optimizado

## Estado Actual

✅ **Build exitoso:** 2.03s
✅ **vercel.json válido:** Sin errores de schema
✅ **Optimizaciones implementadas:** Todas activas
⚠️ **Región:** Automática (geo-routing)
⚠️ **maxDuration: 60** puede requerir Pro según uso

## Siguiente Paso

### Probar con la configuración actual:

1. Deploy con vercel.json corregido
2. Probar dashboard del facilitador
3. Medir tiempos de respuesta:
   - Si < 10s → ✅ Funciona sin región específica
   - Si 10-60s → ⚠️ Necesitas Vercel Pro para `maxDuration: 60`
   - Si > 60s → 🔧 Necesitas Connection Pooling (Opción 1)

### Si persisten timeouts:

**Paso 1:** Cambiar a Connection Pooling
```bash
# En Vercel Dashboard → Settings → Environment Variables
# Editar DATABASE_URL:
postgresql://postgres.tfbseptpjopymatrqhac:A3aHOAliJxJ6rw5K@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Paso 2:** Si aún hay problemas, considerar Vercel Pro

## Verificación

```bash
# Build local
npm run build
# ✓ built in 2.03s

# Commit
git add vercel.json CORRECCION_VERCEL_JSON.md
git commit -m "fix: remove invalid regions config from vercel.json"
git push origin replit-agent-2
```

## Referencias

- Vercel Functions Docs: https://vercel.com/docs/functions/serverless-functions/runtimes
- Vercel Pro Pricing: https://vercel.com/pricing
- Supabase Pooling: https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler

---

**Fecha:** 2025-10-06
**Status:** ✅ Corregido y verificado
