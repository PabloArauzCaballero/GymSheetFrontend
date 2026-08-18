import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/shared/auth/constants';

const publicRoutes = ['/login', '/register'];

export function proxy(request: NextRequest) {
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
