#!/usr/bin/env node

/**
 * Script de verificación de configuración
 * Ejecutar con: node verify-setup.js
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno desde .env manualmente
const envPath = join(__dirname, '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (key && value) {
        process.env[key] = value;
      }
    }
  });
}

console.log('🔍 Verificando configuración del proyecto...\n');

let hasErrors = false;

// Verificar archivo .env
console.log('📁 Verificando archivo .env:');
if (existsSync(envPath)) {
  console.log('   ✅ Archivo .env existe');
} else {
  console.log('   ❌ Archivo .env NO existe');
  console.log('   → Crea un archivo .env basado en .env.example');
  hasErrors = true;
}
console.log();

// Verificar variables de entorno requeridas
console.log('🔑 Verificando variables de entorno:');

const requiredVars = [
  {
    name: 'SUPABASE_URL',
    description: 'URL del proyecto Supabase',
    example: 'https://xxxxx.supabase.co'
  },
  {
    name: 'SUPABASE_ANON_KEY',
    description: 'Clave pública de Supabase',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    description: 'Clave de servicio de Supabase (para MCP)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    optional: true
  },
  {
    name: 'DATABASE_URL',
    description: 'URL de conexión a la base de datos',
    example: 'postgresql://user:password@host:5432/database'
  },
  {
    name: 'SESSION_SECRET',
    description: 'Secreto para sesiones de usuario',
    example: 'un-string-aleatorio-largo',
    optional: true
  }
];

requiredVars.forEach(({ name, description, example, optional }) => {
  const value = process.env[name];

  if (!value) {
    if (optional) {
      console.log(`   ⚠️  ${name} (opcional)`);
      console.log(`      ${description}`);
      console.log(`      Ejemplo: ${example}`);
    } else {
      console.log(`   ❌ ${name} - FALTA`);
      console.log(`      ${description}`);
      console.log(`      Ejemplo: ${example}`);
      hasErrors = true;
    }
  } else if (value.includes('[') || value.includes('tu-') || value.includes('your-')) {
    console.log(`   ⚠️  ${name} - Tiene valor de ejemplo`);
    console.log(`      Por favor reemplaza con tu valor real`);
    hasErrors = true;
  } else {
    const maskedValue = value.length > 20
      ? `${value.slice(0, 20)}...`
      : value.slice(0, 10) + '...';
    console.log(`   ✅ ${name}`);
    console.log(`      Valor: ${maskedValue}`);
  }
  console.log();
});

// Verificar conexión a Supabase (solo validación básica)
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  console.log('🔌 Verificando formato de credenciales Supabase:');

  const url = process.env.SUPABASE_URL;
  if (url.startsWith('https://') && url.includes('.supabase.co')) {
    console.log('   ✅ SUPABASE_URL tiene formato correcto');
  } else {
    console.log('   ⚠️  SUPABASE_URL no tiene el formato esperado');
    console.log('      Debe ser: https://xxxxx.supabase.co');
  }

  const key = process.env.SUPABASE_ANON_KEY;
  if (key.startsWith('eyJ')) {
    console.log('   ✅ SUPABASE_ANON_KEY tiene formato JWT correcto');
  } else {
    console.log('   ❌ SUPABASE_ANON_KEY no parece ser un JWT válido');
    hasErrors = true;
  }
  console.log();
}

// Verificar conexión a base de datos (solo validación básica)
if (process.env.DATABASE_URL) {
  console.log('💾 Verificando formato de DATABASE_URL:');

  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    console.log('   ✅ DATABASE_URL tiene formato PostgreSQL correcto');

    // Verificar que no tenga placeholders
    if (dbUrl.includes('[') || dbUrl.includes('PASSWORD]') || dbUrl.includes('password')) {
      console.log('   ⚠️  DATABASE_URL parece tener un placeholder');
      console.log('      Reemplaza [TU-PASSWORD] o [YOUR-PASSWORD] con tu contraseña real');
      hasErrors = true;
    }
  } else {
    console.log('   ❌ DATABASE_URL no tiene formato PostgreSQL');
    console.log('      Debe empezar con: postgresql:// o postgres://');
    hasErrors = true;
  }
  console.log();
}

// Resumen final
console.log('━'.repeat(60));
if (hasErrors) {
  console.log('❌ CONFIGURACIÓN INCOMPLETA\n');
  console.log('Por favor revisa los errores arriba y configura las variables faltantes.');
  console.log('\nRecursos de ayuda:');
  console.log('  • DATABASE_SETUP.md - Guía de configuración de base de datos');
  console.log('  • SUPABASE_SETUP.md - Guía de configuración de Supabase');
  console.log('  • .env.example - Plantilla de variables de entorno');
  process.exit(1);
} else {
  console.log('✅ CONFIGURACIÓN COMPLETA\n');
  console.log('Todas las variables requeridas están configuradas.');
  console.log('Puedes iniciar el servidor con: npm run dev');
  console.log('\nSi tienes problemas al crear usuarios, revisa DATABASE_SETUP.md');
  process.exit(0);
}
