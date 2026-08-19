import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/shared/auth/constants';
import { tenantCatalog } from '@gymsheet/design-tokens';
import { TENANT_COOKIE, TENANT_COOKIE_MAX_AGE } from '@/shared/theme/tenant-cookie';

const publicRoutes = ['/login', '/register'];

/**
 * Primer segmento de la ruta cuando nombra a un gimnasio conocido.
 *
 * Se comprueba contra el catálogo en vez de aceptar cualquier segmento: así
 * `/dashboard` sigue siendo una ruta de la aplicación y no se interpreta como
 * el gimnasio «dashboard».
 */
function tenantFromPath(pathname: string): string | null {
  const first = pathname.split('/')[1]?.toLowerCase();
  return first && first in tenantCatalog ? first : null;
}

export function proxy(request: NextRequest) {
  const tenantPrefix = tenantFromPath(request.nextUrl.pathname);
  if (tenantPrefix) {
    // Se retira el prefijo y se recuerda la marca en cookie: la aplicación
    // sigue viendo sus rutas de siempre y el resto de la sesión ya sabe a qué
    // gimnasio pertenece.
    const rest = request.nextUrl.pathname.slice(tenantPrefix.length + 1) || '/';
    const target = new URL(rest + request.nextUrl.search, request.url);
    const response = NextResponse.redirect(target);
    response.cookies.set(TENANT_COOKIE, tenantPrefix, {
      path: '/',
      maxAge: TENANT_COOKIE_MAX_AGE,
      sameSite: 'lax',
    });
    return response;
  }

  const pathname = request.nextUrl.pathname;
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE);
  const isPublicAuthRoute = publicRoutes.some((route) => pathname.startsWith(route));
  if (!hasSessionCookie && !isPublicAuthRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (hasSessionCookie && isPublicAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  return NextResponse.next();
}

export const config = {
  // La marca gráfica y el manifiesto los pide el navegador antes de que exista
  // sesión (icono de pestaña, instalación de la aplicación), así que no pueden
  // caer en la redirección a login pese a resolverse por inquilino.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|manifest.webmanifest|brand-mark.svg).*)',
  ],
};
