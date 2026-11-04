import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8080),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default('8h'),
  NOMINATIM_USER_AGENT: z.string().min(1),
  GEOCODE_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  GEOCODE_MAX_QPS: z.coerce.number().int().positive().default(1),
  GEOCODE_RETRY_BACKOFF_MS: z.coerce.number().int().positive().default(500),
  SEED_MANAGER_EMAIL: z.string().email(),
  SEED_MANAGER_PASSWORD: z.string().min(8),
  SEED_MANAGER_NAME: z.string().min(1),
  SEED_RIDER_EMAIL: z.string().email(),
  SEED_RIDER_PASSWORD: z.string().min(8),
  SEED_RIDER_NAME: z.string().min(1),
  SEED_RIDER_VEHICLE_TYPE: z.string().min(1),
  SEED_RIDER_MAX_STOPS: z.coerce.number().int().positive(),
  LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
});

let cached;
export function loadEnv() {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    // Fail fast at startup with consistent style
    const err = new Error('Invalid environment configuration');
    err.code = 'ENV_INVALID';
    err.details = details;
    throw err;
  }
  cached = parsed.data;
  return cached;
}

export const env = loadEnv();
