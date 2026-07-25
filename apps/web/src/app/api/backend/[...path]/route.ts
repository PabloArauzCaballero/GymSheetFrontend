import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/shared/auth/constants';
import { expiredSessionCookieOptions } from '@/shared/server/auth-cookie';
import { backendRequest } from '@/shared/server/backend';
import { resolveAllowedBackendPath } from '@/shared/server/backend-route-policy';
import { isTrustedMutation } from '@/shared/server/csrf';

async function forward(request: NextRequest, parts: string[]) {
  if (!isTrustedMutation(request))
    return NextResponse.json({ detail: 'Origen no permitido.' }, { status: 403 });
  const path = resolveAllowedBackendPath(parts);
  if (!path) return NextResponse.json({ detail: 'Ruta no permitida.' }, { status: 404 });
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ detail: 'Autenticación requerida.' }, { status: 401 });
  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  headers.set('Accept', request.headers.get('accept') ?? 'application/json');
  const query = request.nextUrl.search;
  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text();
  const backendResponse = await backendRequest(`${path}${query}`, {
    method: request.method,
    timeoutMs: path.startsWith('/export/') ? 60_000 : undefined,
    headers,
    token,
    ...(body ? { body } : {}),
  });
  const responseHeaders = new Headers();
  for (const key of ['content-type', 'content-disposition', 'x-request-id']) {
    const value = backendResponse.headers.get(key);
    if (value) responseHeaders.set(key, value);
  }
  const response = new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    headers: responseHeaders,
  });
  if (backendResponse.status === 401) {
    response.cookies.set(SESSION_COOKIE, '', expiredSessionCookieOptions());
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
