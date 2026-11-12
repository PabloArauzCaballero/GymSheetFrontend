'use client';

import { useQuery } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import Link from 'next/link';
import { chatService } from '@/features/chat/services/chat-service';
import { profileViewsService } from '@/features/interactions/services/profile-views-service';
import { interactionKeys } from '@/features/interactions/services/interactions-service';
import { ConnectionsTab } from '@/features/social/components/connections-tab';
import { RequestsTab } from '@/features/social/components/requests-tab';
import { StoriesStrip } from '@/features/stories';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonList } from '@/shared/components/feedback/skeleton';
import { PageHeader } from '@/shared/components/layout/page-header';
import { ButtonLink } from '@/shared/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { ConversationRow } from './conversation-row';

/**
 * Mensajes: conversaciones, solicitudes y conexiones en un solo sitio.
 *
 * Es lo que hay detrás del icono de mensaje de Comunidad, igual que en el
 * móvil. Las tres pestañas responden a la misma pregunta —«¿con quién estoy
 * hablando y quién quiere hablar conmigo?»— y estaban repartidas entre `/chat`
 * y dos pestañas de Comunidad, así que aceptar una solicitud y escribir a esa
 * persona eran dos pantallas distintas.
 */
export function ChatHubClient({
  sessionName,
  sessionUserId,
}: Readonly<{ sessionName: string; sessionUserId: string }>) {
  return (
    // «Mensajes» del móvil (`comunidad-mensajes.tsx`): historias arriba y las
    // tres pestañas debajo, conversaciones en una sola tarjeta de filas.
    <div className="mx-auto grid w-full max-w-[560px] gap-6 lg:max-w-[760px]">
      <PageHeader title="Mensajes" tutorialId="page:chat" />
      <StoriesStrip ownName={sessionName} ownUserId={sessionUserId} />
      <ProfileVisitsNotice />
      <Tabs defaultValue="general">
        <TabsList className="flex w-full gap-0 rounded-none border-b border-[var(--border-subtle)] bg-transparent p-0 shadow-none">
          <TabsTrigger className="flex-1 rounded-none border-b-2 border-transparent bg-transparent text-base data-[state=active]:border-[var(--text)] data-[state=active]:bg-transparent data-[state=active]:font-bold data-[state=active]:shadow-none" value="general">Chats</TabsTrigger>
          <TabsTrigger className="flex-1 rounded-none border-b-2 border-transparent bg-transparent text-base data-[state=active]:border-[var(--text)] data-[state=active]:bg-transparent data-[state=active]:font-bold data-[state=active]:shadow-none" value="solicitudes">Solicitudes</TabsTrigger>
          <TabsTrigger className="flex-1 rounded-none border-b-2 border-transparent bg-transparent text-base data-[state=active]:border-[var(--text)] data-[state=active]:bg-transparent data-[state=active]:font-bold data-[state=active]:shadow-none" value="conexiones">Conexiones</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <ConversationsTab />
        </TabsContent>
        <TabsContent value="solicitudes">
          <RequestsTab />
        </TabsContent>
        <TabsContent value="conexiones">
          <ConnectionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConversationsTab() {
  const conversations = useQuery({
    queryKey: queryKeys.conversations,
    queryFn: chatService.listConversations,
  });

  if (conversations.isLoading) return <SkeletonList rows={4} variant="stacked" />;
  if (conversations.isError) {
    return <ErrorPanel message={conversations.error.message} onRetry={() => conversations.refetch()} />;
  }
  if (!conversations.data?.length) {
    return (
      <EmptyState
        action={
          <ButtonLink href="/comunidad" variant="primary">
            Ir a Comunidad
          </ButtonLink>
        }
        description="Conecta con un socio y envíale un mensaje desde Comunidad."
        title="Sin conversaciones"
      />
    );
  }
  return (
    <ul className="m-0 grid list-none divide-y divide-[var(--border-subtle)] p-0">
      {conversations.data.map((conversation) => (
        <ConversationRow conversation={conversation} key={conversation.conversationId} />
      ))}
    </ul>
  );
}

/**
 * «Hoy te visitaron N personas».
 *
 * El móvil lo dice con un diálogo al entrar. Aquí es un aviso en línea: un
 * modal que aparece solo al abrir una página, en un navegador, se cierra sin
 * leer — y el dato no merece interrumpir. Enlaza a donde está la respuesta
 * completa, que es Interacciones, y no aparece cuando el número es cero.
 */
function ProfileVisitsNotice() {
  const summary = useQuery({
    queryKey: interactionKeys.profileViewsSummary,
    queryFn: () => profileViewsService.summary().catch(() => null),
    staleTime: 60_000,
  });
  const today = summary.data?.uniqueViewersToday ?? 0;
  if (today <= 0) return null;

  return (
    <Link
      className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-4 text-sm text-[var(--text-muted)] transition-colors duration-[var(--dur-2)] hover:border-[var(--border)] hover:text-[var(--text)]"
      href="/interacciones"
    >
      <Eye aria-hidden className="size-4 shrink-0 text-[var(--accent-ink)]" />
      <span>
        <strong className="font-semibold text-[var(--text)]">
          {today === 1 ? '1 persona' : `${today} personas`}
        </strong>{' '}
        {today === 1 ? 'visitó' : 'visitaron'} tu perfil hoy. Mira quién.
      </span>
    </Link>
  );
}
