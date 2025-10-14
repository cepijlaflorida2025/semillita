# Guía de Despliegue en Vercel

## Paso 1: Configurar Variables de Entorno en Vercel

Antes de desplegar, debes configurar las siguientes variables de entorno en tu proyecto de Vercel:

### Ir a: Proyecto > Settings > Environment Variables

Agrega las siguientes variables:

```
DATABASE_URL=postgresql://postgres.zguiwjesnwxukhxqcion:wL08vld7gaLCqCS3K@aws-1-sa-east-1.pooler.supabase.com:6543/postgres

SUPABASE_URL=https://zguiwjesnwxukhxqcion.supabase.co

SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpndWl3amVzbnd4dWtoeHFjaW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Mzc4OTYsImV4cCI6MjA3NjAxMzg5Nn0.fwjN8772yTLENMUkDok8rWwkn4lgEQ8qPWDcc4OOd70

SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpndWl3amVzbnd4dWtoeHFjaW9uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQzNzg5NiwiZXhwIjoyMDc2MDEzODk2fQ.gvICXJjaDcUa7MvHT92t1xfhiis1C9Nb0DhEWwkn9Ec

SESSION_SECRET=cepij-secret-key-2025-production

NODE_ENV=production
```

**IMPORTANTE:** Asegúrate de agregar estas variables para los ambientes: Production, Preview y Development

## Paso 2: Hacer Commit y Push

```bash
git add .
git commit -m "Configure Vercel deployment with serverless functions"
git push origin main
```

## Paso 3: Verificar el Despliegue

Una vez que hagas push, Vercel automáticamente:
1. Detectará los cambios
2. Ejecutará `npm run build`
3. Desplegará la aplicación con las funciones serverless

## Archivos Creados/Modificados

- ✅ `api/server.ts` - Handler serverless para Vercel
- ✅ `vercel.json` - Configuración actualizada con runtime nodejs20.x
- ✅ `tsconfig.server.json` - Actualizado para incluir el directorio api
- ✅ `package.json` - Script de build actualizado
- ✅ `.env.example` - Ejemplo de variables de entorno

## Estructura del Proyecto

```
.
├── api/
│   └── server.ts          # Handler serverless (nuevo)
├── server/
│   └── api/
│       └── server.ts      # Aplicación Express principal
├── client/                # Frontend React
├── dist/                  # Build output
└── vercel.json           # Configuración de Vercel
```

## Troubleshooting

Si el deploy falla:

1. Verifica que todas las variables de entorno estén configuradas en Vercel
2. Revisa los logs de build en el dashboard de Vercel
3. Asegúrate de que `serverless-http` esté en las dependencias (ya está incluido)
4. Verifica que el build local funcione: `npm run build`
