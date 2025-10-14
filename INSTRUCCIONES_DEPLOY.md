# 🚀 Instrucciones de Deploy - Fix de Timeouts

## ✅ Estado Actual

**Build:** ✓ Compila sin errores en 2.34s
**Branch:** `replit-agent-2`
**Cambios:** 8 optimizaciones implementadas
**Documentación:** Completa

---

## 📦 Archivos Importantes

1. **`HISTORIAL_CAMBIOS_FACILITADOR.md`** - Historial completo de cambios (8 iteraciones)
2. **`SOLUCION_TIMEOUTS_VERCEL.md`** - Guía detallada de soluciones y configuración
3. **`vercel.json`** - Configuración de región iad1 (US East)
4. **`.env`** - Variables de entorno locales (referencia)

---

## 🎯 Paso 1: Configurar Variables de Entorno en Vercel

### CRÍTICO: Hacer ANTES de deployar

1. Ve a: https://vercel.com/dashboard
2. Selecciona tu proyecto
3. Settings → Environment Variables
4. Agrega las siguientes (para Production, Preview y Development):

```
SUPABASE_URL=https://tfbseptpjopymatrqhac.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmYnNlcHRwam9weW1hdHJxaGFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDUwMDksImV4cCI6MjA3MjkyMTAwOX0.2vHO9GmaBKaLz_1JW845EVaSv7Skja59iE7J_oRRwwM
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmYnNlcHRwam9weW1hdHJxaGFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0NTAwOSwiZXhwIjoyMDcyOTIxMDA5fQ.aFCHsY9En71yiW2Pe6F4uTXcQFbAJat0sxgsGc4DzXM
SESSION_SECRET=cepij-pas-san-miguel-secret-key-2025-production
NODE_ENV=production
```

### Base de Datos - ELEGIR UNA OPCIÓN:

**Opción A - Conexión Directa (Recomendada para empezar):**
```
DATABASE_URL=postgresql://postgres:A3aHOAliJxJ6rw5K@db.tfbseptpjopymatrqhac.supabase.co:5432/postgres?sslmode=require
```

**Opción B - Connection Pooling (Si opción A da timeout):**
```
DATABASE_URL=postgresql://postgres.tfbseptpjopymatrqhac:A3aHOAliJxJ6rw5K@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

⚠️ **Usar primero la Opción A**. Solo cambiar a Opción B si persisten timeouts.

---

## 🚀 Paso 2: Deploy

```bash
# 1. Verificar que estás en la rama correcta
git branch
# Debe mostrar: * replit-agent-2

# 2. Verificar cambios pendientes
git status

# 3. Agregar cambios si hay
git add vercel.json
git add HISTORIAL_CAMBIOS_FACILITADOR.md
git add SOLUCION_TIMEOUTS_VERCEL.md
git add INSTRUCCIONES_DEPLOY.md

# 4. Commit
git commit -m "fix: optimize queries, polling and configure iad1 region for Vercel"

# 5. Push
git push origin replit-agent-2
```

**Vercel detectará el push y deployará automáticamente.**

---

## 📊 Paso 3: Monitorear el Deploy

### En Vercel Dashboard:

1. Ve a: https://vercel.com/dashboard → Tu Proyecto → Deployments
2. Espera a que el status sea: ✅ **Ready**
3. Click en el deployment
4. Revisa:
   - Build Logs → Debe completar sin errores
   - Function Logs → No debe haber errores de conexión

### Probar la Aplicación:

1. Abre la URL de producción (ej: `https://tu-proyecto.vercel.app`)
2. Loguea como facilitador
3. **Verificar Dashboard:**
   - [ ] Dashboard carga niños registrados
   - [ ] Emociones se muestran con emoji y nombre
   - [ ] No hay error 504 timeout
   - [ ] Carga en < 5 segundos
4. **Verificar Bitácora:**
   - [ ] Click en un niño
   - [ ] Bitácora muestra entradas del journal
   - [ ] Emociones completas en cada entrada
   - [ ] No hay error 504 timeout
   - [ ] Carga en < 5 segundos

### En la Consola del Navegador (F12):

**Network Tab:**
```
GET /api/facilitator/dashboard
Status: 200 ✅
Time: ~3-5s ✅

GET /api/facilitator/child/[id]
Status: 200 ✅
Time: ~2-4s ✅
```

**Console:**
- No debe haber errores de React Query
- No debe haber errores de tipo "Failed to fetch"

---

## ✅ Checklist de Éxito

| Item | Estado | Cómo Verificar |
|------|--------|----------------|
| Variables de entorno en Vercel | [ ] | Vercel Dashboard → Settings → Environment Variables |
| Build exitoso | [ ] | Vercel Deployments → Status: Ready |
| Dashboard carga | [ ] | Visualmente en navegador |
| Niños se muestran | [ ] | Visualmente en navegador |
| Emociones visibles | [ ] | Emoji + nombre en cada niño |
| Click en niño funciona | [ ] | Redirige a `/facilitator/child/:id` |
| Bitácora se muestra | [ ] | Visualmente en navegador |
| Entradas con emociones | [ ] | Cada entrada tiene emoji y texto |
| Sin timeouts | [ ] | Network tab, sin 504 |
| Auto-refresh funciona | [ ] | Esperar 30s, verifica actualización |

---

## ❌ Si Hay Problemas

### Problema 1: Still 504 Timeout

**Solución 1:** Cambiar a Connection Pooling
1. Ve a Vercel → Settings → Environment Variables
2. Edita `DATABASE_URL`
3. Cambia a: `postgresql://postgres.tfbseptpjopymatrqhac:A3aHOAliJxJ6rw5K@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
4. Redeploy: Vercel → Deployments → [último] → Redeploy

**Solución 2:** Ver sección completa en `SOLUCION_TIMEOUTS_VERCEL.md`

### Problema 2: Variables de Entorno No Detectadas

**Síntoma en logs:**
```
Error: SUPABASE_URL is undefined
Error: DATABASE_URL is undefined
```

**Solución:**
1. Verifica que las variables estén en Production AND Preview
2. Redeploy forzado:
   ```bash
   git commit --allow-empty -m "redeploy: trigger new deployment"
   git push origin replit-agent-2
   ```

### Problema 3: Dashboard No Muestra Niños

**Revisar:**
1. Console → ¿Hay error de autenticación?
2. Network → `/api/facilitator/dashboard` → Response → ¿Qué contiene?
3. Vercel Logs → ¿Hay error en el servidor?

**Posibles causas:**
- Usuario no tiene rol "facilitator"
- No hay niños registrados en la BD
- Error de query en Supabase

---

## 🔄 Rollback de Emergencia

Si algo sale mal CRÍTICO:

```bash
# Opción 1: Revertir último commit
git revert HEAD
git push origin replit-agent-2

# Opción 2: Volver a commit estable anterior
git reset --hard dbf506b
git push --force origin replit-agent-2

# Opción 3: En Vercel Dashboard
# → Deployments → [deployment anterior estable] → Promote to Production
```

---

## 📞 Siguiente Paso Si Todo Funciona

1. ✅ Marca todos los items del checklist
2. 📸 Toma screenshots de:
   - Dashboard con niños
   - Bitácora individual
   - Network tab mostrando 200 OK
3. 📝 Documenta:
   - Tiempos de respuesta
   - Número de niños cargados
   - Cualquier warning en console

---

## 📚 Referencias

- **Cambios técnicos:** `HISTORIAL_CAMBIOS_FACILITADOR.md`
- **Soluciones detalladas:** `SOLUCION_TIMEOUTS_VERCEL.md`
- **Vercel Docs:** https://vercel.com/docs/functions/serverless-functions
- **Supabase Connection Pooling:** https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler

---

**Última actualización:** 2025-10-06
**Branch:** replit-agent-2
**Build:** ✓ 2.34s
**Región:** iad1 (US East)
