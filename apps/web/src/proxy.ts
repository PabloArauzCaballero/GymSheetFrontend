import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/shared/auth/constants';
import { tenantCatalog } from '@gymsheet/design-tokens';
import { TENANT_COOKIE, TENANT_COOKIE_MAX_AGE } from '@/shared/theme/tenant-cookie';

// Recuperar la contraseña es, por definición, algo que se hace sin sesión: sin
// esta ruta aquí, quien la ha olvidado acaba redirigido al formulario que
// justamente no puede completar. Términos y privacidad son la misma historia:
// se enlazan desde el registro, antes de que exista una cuenta — sin esto,
// tocar el enlace durante el alta rebotaba a /login.
const publicRoutes = ['/login', '/register', '/recover-password', '/terminos', '/privacidad'];

// Directorio de gimnasios (punto 14): a diferencia de lo anterior, esto no es
// parte del flujo de autenticación — alguien con sesión también puede querer
// buscar otra sede, así que nunca se lo rebota a /dashboard por tenerla.
const publicContentRoutes = ['/gimnasios'];

/**
 * Primer segmento de la ruta cuando nombra a un gimnasio conocido.
 *
 * Se comprueba contra el catálogo en vez de aceptar cualquier segmento: así
 * `/dashboard` sigue siendo una ruta de la aplicación y no se interpreta como
 * el gimnasio «dashboard».
 */
function tenantFromPath(pathname: string): string | null {
  const first = pathname.split('/')[1]?.toLowerCase();
  // `Object.hasOwn` y no `in`: `'constructor' in {}` es true, así que `/constructor`
  // y `/__proto__` se tomaban por gimnasios y se llevaban una cookie de un año.
  return first && Object.hasOwn(tenantCatalog, first) ? first : null;
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
  // La landing (`/`) es la única ruta pública que también existe para
  // cuentas con sesión — pero ahí prefieren su panel, así que se le aplica la
  // misma regla que a login/register más abajo en vez de a las de contenido.
  const isLandingRoute = pathname === '/';
  const isPublicContentRoute = publicContentRoutes.some((route) => pathname.startsWith(route));

  if (!hasSessionCookie && !isPublicAuthRoute && !isLandingRoute && !isPublicContentRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (hasSessionCookie && (isPublicAuthRoute || isLandingRoute)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  return NextResponse.next();
}

export const config = {
  // La marca gráfica y el manifiesto los pide el navegador antes de que exista
  // sesión (icono de pestaña, instalación de la aplicación), así que no pueden
  // caer en la redirección a login pese a resolverse por inquilino.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|brand-mark.svg).*)',
  ],
};
