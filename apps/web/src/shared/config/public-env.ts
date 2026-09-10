import { z } from 'zod';

/**
 * A diferencia de `env.ts` (server-only), esto SÍ llega al navegador: Next.js
 * inlinea `NEXT_PUBLIC_*` en el bundle del cliente durante el build. Solo
 * existe porque el socket de chat necesita conectar directo contra el
 * backend, algo que las rutas BFF no pueden proxiar (no hay upgrade de
 * WebSocket en un route handler de Next).
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_BACKEND_ORIGIN: z.string().url().default('http://localhost:3001'),
});

const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_BACKEND_ORIGIN: process.env.NEXT_PUBLIC_BACKEND_ORIGIN,
});

if (!parsed.success) {
  throw new Error(`Configuración pública inválida: ${parsed.error.message}`);
}

export const publicEnv = parsed.data;
