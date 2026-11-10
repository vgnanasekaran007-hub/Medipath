import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });
dotenv.config({ path: resolve(__dirname, '../.env') });

const rawMode = process.env.PERSISTENCE_MODE ?? 'auto';
const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const hasValidSupabaseConfig =
  Boolean(supabaseUrl) &&
  !supabaseUrl.includes('your-project-ref') &&
  Boolean(supabaseServiceRoleKey) &&
  !supabaseServiceRoleKey.includes('your-supabase');

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET ?? '',
  devJwtSecret: process.env.DEV_JWT_SECRET ?? 'medipath-local-dev-secret-change-in-production',
  persistenceMode:
    rawMode === 'supabase'
      ? ('supabase' as const)
      : rawMode === 'local'
        ? ('local' as const)
        : hasValidSupabaseConfig
          ? ('supabase' as const)
          : ('local' as const),
  hasValidSupabaseConfig,
};

