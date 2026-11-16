import { NextResponse, type NextRequest } from 'next/server';
import { reversePlace, searchPlaces } from '@/shared/server/geocoding';
import { AccountSuspendedError, getSession } from '@/shared/server/session';
import { isValidLatLng } from '@/shared/lib/geo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * `GET /api/geocode?q=texto` busca direcciones; `?lat=&lng=` hace la búsqueda
 * inversa. No es un proxy abierto hacia Nominatim: la sesión se valida contra
 * el backend (no basta con que exista la cookie) y solo el administrador de
 * plataforma, que es quien da de alta y mueve sedes, puede usarlo.
 */
export async function GET(request: NextRequest) {
  const session = await getSession().catch((error: unknown) => {
    if (error instanceof AccountSuspendedError) return null;
    throw error;
  });
  if (!session) return NextResponse.json({ places: [] }, { status: 401 });
  // Franja 7a: branches are managed by the platform admin, not by the gym.
  if (session.role !== 'SYSTEM_ADMIN') return NextResponse.json({ places: [] }, { status: 403 });

  const params = request.nextUrl.searchParams;
  const query = params.get('q')?.trim() ?? '';
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));

  let result;
  if (query.length >= 3 && query.length <= 200) result = await searchPlaces(query);
  else if (params.has('lat') && params.has('lng') && isValidLatLng(lat, lng)) {
    result = await reversePlace(lat, lng);
  } else return NextResponse.json({ places: [] }, { status: 400 });

  if (!result.ok) return NextResponse.json({ places: [] }, { status: result.status });
  return NextResponse.json(
    { places: result.places },
    { headers: { 'Cache-Control': 'private, max-age=3600' } },
  );
}
