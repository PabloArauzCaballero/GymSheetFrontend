import type { Metadata } from 'next';
import { MessageThreadClient } from '@/features/chat/components/message-thread-client';
import { resolveBackendOrigin } from '@/shared/config/backend-origin';
import { serverEnv } from '@/shared/config/env';
import { publicEnv } from '@/shared/config/public-env';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Conversación' };

export default async function ConversationPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const [session, routeParams] = await Promise.all([requireSession(), params]);
  // Se resuelve aquí, en el servidor y en cada petición: cambiar el dominio del
  // backend es una variable de entorno y un reinicio, no una reconstrucción.
  const socketOrigin = resolveBackendOrigin({
    runtime: serverEnv.BACKEND_PUBLIC_ORIGIN,
    baked: publicEnv.NEXT_PUBLIC_BACKEND_ORIGIN,
  });
  return (
    <MessageThreadClient
      conversationId={routeParams.id}
      currentUserId={session.id}
      socketOrigin={socketOrigin}
    />
  );
}
