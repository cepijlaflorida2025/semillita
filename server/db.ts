import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from "../shared/schema.js";

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set!');
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log('🔍 [DB] Initializing Postgres database client for Supabase...');
console.log('🔗 [DB] URL pattern:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));

// Detect connection type based on URL
const isUsingPooler = process.env.DATABASE_URL.includes('pooler.supabase.com');
const isTransactionMode = isUsingPooler && process.env.DATABASE_URL.includes(':6543');

const connectionMode = isUsingPooler
  ? (isTransactionMode ? 'Transaction Pooler' : 'Session Pooler')
  : 'Direct Connection';

console.log(`📊 Connection mode: ${connectionMode}`);

// CRITICAL: Vercel is IPv4-only and REQUIRES Transaction Pooler
// Direct Connection will timeout (60s) on Vercel
if (process.env.VERCEL && !isUsingPooler) {
  throw new Error('❌ Vercel requires Transaction Pooler! Use: postgresql://postgres.tfbseptpjopymatrqhac:[PASSWORD]@aws-1-sa-east-1.pooler.supabase.com:6543/postgres');
}

console.log('⚙️  [DB] Configuring client with prepare: false (required for pooler compatibility)');

// Create Postgres client with appropriate settings
const queryClient = postgres(process.env.DATABASE_URL, {
  // CRITICAL: ALWAYS disable prepared statements for pooler compatibility
  // Transaction Pooler (port 6543) does NOT support prepared statements
  // Even Session Pooler can have issues - safest to disable always
  prepare: false,

  // Connection limits - minimize for serverless (1 connection is enough with pooler)
  max: 1,

  // Timeouts - CRITICAL for avoiding 60s hangs
  idle_timeout: 20,
  connect_timeout: 10,

  // Lifetime - keep connections fresh in pooler
  max_lifetime: 60 * 5, // 5 minutes

  // Performance optimizations
  fetch_types: false, // Skip type fetching for faster initialization

  transform: {
    undefined: null, // Convert undefined to null for Postgres
  },

  // Suppress notices for cleaner logs
  onnotice: () => {},
});

console.log('✅ [DB] Schema imported successfully');
console.log('🚀 [DB] Client initialized, ready to accept queries');

export const db = drizzle(queryClient, { schema });
