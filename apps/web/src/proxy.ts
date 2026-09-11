import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/shared/auth/constants';
import { tenantCatalog } from '@gymsheet/design-tokens';
import { TENANT_COOKIE, TENANT_COOKIE_MAX_AGE } from '@/shared/theme/tenant-cookie';

// Recuperar la contraseña es, por definición, algo que se hace sin sesión: sin
// esta ruta aquí, quien la ha olvidado acaba redirigido al formulario que
// justamente no puede completar.
const publicRoutes = ['/login', '/register', '/recover-password'];

// Directorio de gimnasios (punto 14): a diferencia de lo anterior, esto no es
// parte del flujo de autenticación — alguien con sesión también puede querer
// buscar otra sede, así que nunca se lo rebota a /dashboard por tenerla.
//
// Términos y privacidad viven aquí por lo mismo (M-1). Estaban en `publicRoutes`
// para que se pudieran leer durante el alta, pero esa lista arrastra la regla
// «con sesión → /dashboard», pensada para login y registro: el resultado era que
// quien tenía cuenta no podía releer los términos que había aceptado. Siguen
// siendo públicos — esta lista también exime del muro de acceso.
const publicContentRoutes = ['/gimnasios', '/terminos', '/privacidad'];

// Primeros segmentos que la aplicación resuelve de verdad. Sirve para dar 404
// antes que el muro de acceso (M-4): sin esto, un enlace roto compartido en
// redes pedía credenciales a quien lo abría — parece phishing, y tras iniciar
// sesión el `returnTo` llevaba igualmente al 404.
//
// Es una lista estática a propósito: el proxy corre en el edge y no puede mirar
// el árbol de `app/`. Al añadir una ruta de primer nivel hay que añadirla aquí
// también; `proxy.test.ts` la contrasta con el contenido real de `src/app`.
export const knownRoutes = new Set([
  'login',
  'register',
  'recover-password',
  'terminos',
  'privacidad',
  'gimnasios',
  'access',
  'activar',
  'admin',
  'chat',
  'comunidad',
  'dashboard',
  'exercises',
  'interacciones',
  'membership',
  'notifications',
  'onboarding',
  'plans',
  'profile',
  'routines',
  'trayectoria',
  'tutorials',
  'workouts',
]);

function isKnownRoute(pathname: string): boolean {
  const first = pathname.split('/')[1] ?? '';
  return first === '' || knownRoutes.has(first);
}

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

  // El 404 se resuelve ANTES que el muro de acceso: una ruta que no existe no
  // tiene nada que proteger, y pedir credenciales para enseñarla es peor que
  // decir que no está. `next()` deja que Next pinte su `not-found` con 404.
  //
  // Si alguien añade una ruta y olvida `knownRoutes`, esto la dejaría pasar sin
  // muro — pero no la expone: `app/(portal)/layout.tsx` llama a
  // `requireSession()` en el servidor para todo el portal, y las páginas de
  // administración añaden `requireRole`. El proxy es defensa en profundidad,
  // no la única puerta; y `proxy.test.ts` falla si la lista se queda vieja.
  if (!isKnownRoute(pathname)) {
    return NextResponse.next();
  }

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
