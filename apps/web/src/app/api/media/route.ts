import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/shared/auth/constants';
import { fetchExternalMedia } from '@/shared/server/media-proxy';
import { verifyMediaSignature } from '@/shared/server/media-signing';

// Proxy de medios del BFF: sirve imágenes y vídeos externos desde el mismo
// origen para eliminar mixed-content (http en página https), protección
// anti-hotlink y CORS. El navegador nunca toca el CDN externo directamente, y
// por eso el `media-src` de la CSP puede seguir siendo `'self'`.
//
// El acceso está acotado por DOS vías (basta una), de modo que el endpoint no
// es un proxy abierto:
//   1. Sesión autenticada (cookie): el usuario ya está dentro de la app.
//   2. Firma HMAC válida sobre la `url` (`sig`): la generó un componente de
//      servidor nuestro a partir del catálogo del backend — es como sirven sus
//      imágenes las páginas públicas sin sesión (`/gimnasios`, portada).
// `fetchExternalMedia` cubre además el SSRF hacia la red interna.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('url');
  if (!raw) return new NextResponse(null, { status: 400 });

  const signature = request.nextUrl.searchParams.get('sig');
  const signed = verifyMediaSignature(raw, signature);
  const authenticated = Boolean((await cookies()).get(SESSION_COOKIE)?.value);
  if (!signed && !authenticated) return new NextResponse(null, { status: 403 });

  // El `Range` del navegador se reenvía: es lo que deja a un `<video>` empezar
  // a reproducir sin descargar el clip entero y buscar dentro de él. La
  // respuesta puede venir como 206 y con `Content-Range`, y se devuelve igual.
  const result = await fetchExternalMedia(raw, request.headers.get('range'));
  if (!result.ok) return new NextResponse(null, { status: result.status });

  return new NextResponse(result.body, {
    status: result.status,
    headers: {
      'Content-Type': result.contentType,
      ...result.headers,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
