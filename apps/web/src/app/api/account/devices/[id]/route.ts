import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { backendRequest } from '@/shared/server/backend';
import { relayJson, sessionTokenOrReject } from '@/shared/server/bff-route';

type RouteContext = { params: Promise<{ id: string }> };

/** Signs one device out. A foreign id answers 404 from the backend, relayed as is. */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const token = await sessionTokenOrReject(request);
  if (typeof token !== 'string') return token;
  const id = z
    .string()
    .uuid()
    .safeParse((await context.params).id);
  if (!id.success) return NextResponse.json({ detail: 'Recurso no encontrado.' }, { status: 404 });
  return relayJson(await backendRequest(`/me/devices/${id.data}`, { method: 'DELETE', token }));
}
