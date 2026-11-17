import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/shared/auth/constants';
import { expiredSessionCookieOptions } from '@/shared/server/auth-cookie';
import { backendRequest } from '@/shared/server/backend';
import { isNoStoreBackendPath, resolveAllowedBackendPath } from '@/shared/server/backend-route-policy';
import { isTrustedMutation } from '@/shared/server/csrf';
import {
  decodeImpersonation,
  expiredImpersonationCookieOptions,
  IMPERSONATION_COOKIE,
} from '@/shared/server/impersonation';

async function forward(request: NextRequest, parts: string[]) {
  if (!isTrustedMutation(request))
    return NextResponse.json({ detail: 'Origen no permitido.' }, { status: 403 });
  const path = resolveAllowedBackendPath(parts);
  if (!path) return NextResponse.json({ detail: 'Ruta no permitida.' }, { status: 404 });
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionToken) return NextResponse.json({ detail: 'Autenticación requerida.' }, { status: 401 });
  // While a platform admin operates a gym, every proxied call carries the scoped token.
  const impersonation = decodeImpersonation(cookieStore.get(IMPERSONATION_COOKIE)?.value, sessionToken);
  const token = impersonation?.accessToken ?? sessionToken;
  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  headers.set('Accept', request.headers.get('accept') ?? 'application/json');
  const query = request.nextUrl.search;
  // El cuerpo se reenvía como bytes, no como texto: las cargas de media viajan
  // en `multipart/form-data` y decodificarlas a string corrompe el binario.
  const body = ['GET', 'HEAD'].includes(request.method)
    ? undefined
    : await request.arrayBuffer();
  const backendResponse = await backendRequest(`${path}${query}`, {
    method: request.method,
    // Las subidas viajan por la misma puerta que el JSON, pero no tardan lo
    // mismo: una story o un vídeo de chat son megabytes, y el tiempo por
    // defecto los corta a mitad de camino.
    timeoutMs:
      path.startsWith('/export/') ||
      path.startsWith('/me/export/') ||
      path === '/admin/media' ||
      path === '/me/stories' ||
      path.startsWith('/me/stories/') ||
      path.endsWith('/messages/media') ||
      (path.startsWith('/me/verification/') && path.endsWith('/selfie')) ||
      path === '/business/me/kyc/documents' ||
      path === '/business/me/media'
        ? 60_000
        : undefined,
    headers,
    token,
    ...(body && body.byteLength > 0 ? { body } : {}),
  });
  const responseHeaders = new Headers();
  for (const key of ['content-type', 'content-disposition', 'cache-control', 'x-content-type-options', 'x-request-id']) {
    const value = backendResponse.headers.get(key);
    if (value) responseHeaders.set(key, value);
  }
  // Identity data in clear and decrypted KYC photos never land in a browser or proxy cache,
  // whatever the backend header says (it already sends `private, no-store`).
  if (isNoStoreBackendPath(path)) responseHeaders.set('cache-control', 'private, no-store');
  const response = new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    headers: responseHeaders,
  });
  if (backendResponse.status === 401) {
    // A refused scoped token ends the impersonation, not the session: the next
    // request goes out with the account's own token and tells whether it still holds.
    if (impersonation) response.cookies.set(IMPERSONATION_COOKIE, '', expiredImpersonationCookieOptions());
    else response.cookies.set(SESSION_COOKIE, '', expiredSessionCookieOptions());
  }
  return response;
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  return forward(request, (await context.params).path);
}
export async function POST(request: NextRequest, context: RouteContext) {
  return forward(request, (await context.params).path);
}
export async function PATCH(request: NextRequest, context: RouteContext) {
  return forward(request, (await context.params).path);
}
export async function PUT(request: NextRequest, context: RouteContext) {
  return forward(request, (await context.params).path);
}
export async function DELETE(request: NextRequest, context: RouteContext) {
  return forward(request, (await context.params).path);
}
