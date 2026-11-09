import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/shared/auth/constants';
import { reversePlace, searchPlaces } from '@/shared/server/geocoding';
import { isValidLatLng } from '@/shared/lib/geo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * `GET /api/geocode?q=texto` busca direcciones; `?lat=&lng=` hace la búsqueda
 * inversa. Solo con sesión: no es un proxy abierto hacia Nominatim.
 */
export async function GET(request: NextRequest) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ places: [] }, { status: 401 });

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
