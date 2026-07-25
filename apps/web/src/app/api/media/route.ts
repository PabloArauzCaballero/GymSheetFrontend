import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/shared/auth/constants';
import { fetchExternalImage } from '@/shared/server/media-proxy';

// Proxy de imágenes del BFF: sirve medios externos desde el mismo origen para
// eliminar mixed-content (http en página https), protección anti-hotlink y CORS.
// El navegador nunca toca el CDN externo directamente.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Solo sesiones autenticadas: evita convertir el BFF en un proxy abierto.
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return new NextResponse(null, { status: 401 });

  const raw = request.nextUrl.searchParams.get('url');
  if (!raw) return new NextResponse(null, { status: 400 });

  const result = await fetchExternalImage(raw);
  if (!result.ok) return new NextResponse(null, { status: result.status });

  return new NextResponse(result.body, {
    status: 200,
    headers: {
      'Content-Type': result.contentType,
      'Content-Length': String(result.body.byteLength),
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
