import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Firma de URLs para el proxy de imágenes (`/api/media`).
 *
 * El proxy sirve medios externos desde nuestro origen sin sesión, porque el
 * directorio público (`/gimnasios`, portada) se renderiza para visitantes
 * anónimos. Sin más control eso es un proxy abierto: cualquiera podría pedir
 * `/api/media?url=<lo que sea>` y hacer que el servidor descargue URLs
 * arbitrarias (amplificación, lavado de hotlink, peticiones a terceros desde
 * nuestra IP), y `fetchExternalImage` solo mitiga el vector SSRF interno.
 *
 * Con firma, el servidor solo proxya URLs que él mismo emitió: los componentes
 * de servidor de las páginas públicas llaman a `signMediaUrl` con URLs del
 * catálogo del backend, y la ruta rechaza (`403`) cualquier `url` sin firma
 * válida. Las llamadas autenticadas siguen entrando por la cookie de sesión.
 */

// Secreto dedicado. En desarrollo cae a un valor fijo. En producción DEBE
// definirse `MEDIA_PROXY_SECRET` (ver `.env.example`): si falta se avisa una vez
// y se usa el valor de desarrollo, que deja el endpoint tan expuesto como
// cualquier secreto por defecto — pero no se lanza en tiempo de importación
// para no romper `next build`, que corre sin secretos de runtime.
const DEV_FALLBACK = 'gymsheet-dev-media-signing-key-change-me';
let warned = false;

function getSecret(): string {
  const fromEnv = process.env.MEDIA_PROXY_SECRET;
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === 'production' && !warned) {
    warned = true;
    console.error(
      '[media-signing] MEDIA_PROXY_SECRET no está definido en producción; usando el valor de desarrollo. Configúralo.',
    );
  }
  return DEV_FALLBACK;
}

function sign(rawUrl: string): string {
  return createHmac('sha256', getSecret()).update(rawUrl).digest('base64url');
}

/**
 * Ruta del proxy con la firma incorporada, para URLs externas. Las locales o
 * `data:` se devuelven intactas (no necesitan proxy). Pensada para componentes
 * de servidor de páginas públicas, que es donde el proxy corre sin sesión.
 */
export function signedMediaSrc(rawUrl: string): string {
  if (!/^https?:\/\//iu.test(rawUrl)) return rawUrl;
  const params = new URLSearchParams({ url: rawUrl, sig: sign(rawUrl) });
  return `/api/media?${params.toString()}`;
}

/** `true` si `signature` corresponde a `rawUrl`. Comparación en tiempo constante. */
export function verifyMediaSignature(rawUrl: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = Buffer.from(sign(rawUrl));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
