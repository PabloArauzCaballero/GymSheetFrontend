import type { MetadataRoute } from 'next';
import { serverEnv } from '@/shared/config/env';

// Sin esto, Next intenta generar este archivo una sola vez en el build —
// momento en el que `APP_URL` todavía no tiene el valor real de runtime que
// inyecta docker-compose, y queda congelado con el valor por defecto.
export const dynamic = 'force-dynamic';

/**
 * Solo la landing y el directorio de gimnasios están pensados para
 * indexarse (punto 14) — el resto es producto autenticado. Las reglas más
 * específicas ganan sobre las generales sin importar el orden, así que
 * `disallow: '/'` no tapa las excepciones listadas en `allow`.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: ['/$', '/gimnasios'], disallow: '/' }],
    sitemap: `${serverEnv.APP_URL}/sitemap.xml`,
  };
}
