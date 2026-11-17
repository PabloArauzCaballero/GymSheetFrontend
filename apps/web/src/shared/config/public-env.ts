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
  /**
   * Bandera `routinesV2` del plan Rutinas REPP: enciende el asistente de
   * creación por pasos. Por defecto encendida en desarrollo y pruebas, apagada
   * en producción, para poder activarla sin revertir nada.
   */
  NEXT_PUBLIC_ROUTINES_V2: z.enum(['true', 'false']).optional(),
  /** Cloudflare Turnstile site key. Unset: the signup renders no widget and sends no token. */
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().trim().min(1).optional(),
  /** Google OAuth web client id. Unset: no «Continuar con Google» anywhere. */
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().trim().min(1).optional(),
});

const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_BACKEND_ORIGIN: process.env.NEXT_PUBLIC_BACKEND_ORIGIN,
  NEXT_PUBLIC_ROUTINES_V2: process.env.NEXT_PUBLIC_ROUTINES_V2 || undefined,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || undefined,
});

if (!parsed.success) {
  throw new Error(`Configuración pública inválida: ${parsed.error.message}`);
}

export const publicEnv = {
  ...parsed.data,
  routinesV2: (parsed.data.NEXT_PUBLIC_ROUTINES_V2 ?? (process.env.NODE_ENV === 'production' ? 'false' : 'true')) === 'true',
};
