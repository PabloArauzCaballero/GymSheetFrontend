import 'server-only';
import { z } from 'zod';

const serverEnvSchema = z.object({
  BACKEND_API_URL: z.string().url().default('http://localhost:3000/api/v1'),
  APP_URL: z.string().url().default('http://localhost:3001'),
  BACKEND_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(15_000),
});

const parsed = serverEnvSchema.safeParse({
  BACKEND_API_URL: process.env.BACKEND_API_URL,
  APP_URL: process.env.APP_URL,
  BACKEND_REQUEST_TIMEOUT_MS: process.env.BACKEND_REQUEST_TIMEOUT_MS,
});

if (!parsed.success) {
  throw new Error(`Configuración inválida: ${parsed.error.message}`);
}

export const serverEnv = parsed.data;
