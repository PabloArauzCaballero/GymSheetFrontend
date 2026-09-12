'use client';

import { useQuery } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useChatSocket } from '@/features/chat/hooks/use-chat-socket';
import { chatService } from '@/features/chat/services/chat-service';
import type { Message } from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import {
  SkeletonPageHeader,
  SkeletonScreen,
  SkeletonThread,
} from '@/shared/components/feedback/skeleton';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { PageHeader } from '@/shared/components/layout/page-header';
import { cn } from '@/shared/lib/cn';
import { notify } from '@/shared/notifications';

function mergeMessages(existing: Message[], incoming: Message) {
  if (existing.some((message) => message.id === incoming.id)) return existing;
  return [...existing, incoming];
}

export function MessageThreadClient({
  conversationId,
  currentUserId,
  socketOrigin,
}: Readonly<{ conversationId: string; currentUserId: string; socketOrigin: string }>) {
  const history = useQuery({
    queryKey: queryKeys.messages(conversationId),
    queryFn: () => chatService.listMessages(conversationId),
  });
  // El historial de mensajes no trae el nombre de la otra persona: se toma de
  // la lista de conversaciones, ya en caché si se llegó a esta pantalla
  // navegando desde /chat.
  const conversations = useQuery({
    queryKey: queryKeys.conversations,
    queryFn: chatService.listConversations,
  });
  // Los mensajes en vivo solo se ACUMULAN desde el socket (evento externo);
  // el historial de la consulta se mezcla al leer, sin copiarlo a estado con
  // un efecto — así no hay una fuente de verdad duplicada que sincronizar.
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const joinedRef = useRef(false);

  const { connectionState, joinConversation, sendMessage } = useChatSocket(socketOrigin, (incoming) => {
    if (incoming.conversationId !== conversationId) return;
    setLiveMessages((current) => mergeMessages(current, incoming));
  });

  const messages = useMemo(() => {
    const base = history.data ?? [];
    const seen = new Set(base.map((message) => message.id));
    return [...base, ...liveMessages.filter((message) => !seen.has(message.id))];
  }, [history.data, liveMessages]);

  useEffect(() => {
    if (connectionState !== 'connected' || joinedRef.current) return;
    joinedRef.current = true;
    void joinConversation(conversationId);
  }, [connectionState, conversationId, joinConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const otherConversation = conversations.data?.find(
    (conversation) => conversation.conversationId === conversationId,
  );
  const otherName = otherConversation?.otherUserName;
  const canWrite = otherConversation?.canWrite !== false;

  async function handleSend() {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    try {
      const ack = await sendMessage(conversationId, body);
      if (!ack.ok) {
        // El socket no lo entregó (reconectando, boleto vencido): REST usa el
        // mismo `ChatService.sendMessage`, así que igual llega por el socket
        // a quien esté conectado.
        await chatService.sendMessage(conversationId, body);
      }
      setDraft('');
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error : new Error('No se pudo enviar el mensaje.'));
    } finally {
      setSending(false);
    }
  }

  if (history.isLoading) {
    return (
      <SkeletonScreen className="gap-6" label="Cargando la conversación">
        <SkeletonPageHeader />
        <SkeletonThread />
      </SkeletonScreen>
    );
  }
  if (history.isError) {
    return <ErrorPanel message={history.error.message} onRetry={() => history.refetch()} />;
  }

  return (
    <div className="grid gap-6" style={{ gridTemplateRows: 'auto 1fr auto' }}>
      <PageHeader
        actions={
          <Badge tone={connectionState === 'connected' ? 'success' : 'neutral'}>
            {connectionState === 'connected' ? 'En vivo' : 'Conectando…'}
          </Badge>
        }
        eyebrow="Chat"
        title={otherName ?? 'Conversación'}
      />
      {/* `role="log"` trae de serie `aria-live="polite"` + `aria-relevant="additions"`,
          que es justo lo que pide un chat: anuncia el mensaje que ENTRA sin releer
          todo el hilo. Sin esto, los mensajes llegaban por socket y un lector de
          pantalla no decía nada: la conversación avanzaba en silencio. */}
      <section
        aria-label="Mensajes"
        className="panel grid max-h-[60vh] gap-2 overflow-y-auto p-4"
        role="log"
      >
        {messages.length === 0 ? (
          <p className="m-auto max-w-xs py-8 text-center text-sm leading-6 text-[var(--text-muted)]">
            Aún no hay mensajes. Escribe el primero y empieza la conversación.
          </p>
        ) : null}
        {messages.map((message) => {
          const mine = message.senderId === currentUserId;
          return (
            <div
              className={cn('max-w-[75%] break-words rounded-[8px] px-3 py-2 text-sm', mine ? 'ml-auto' : 'mr-auto')}
              key={message.id}
              style={{
                background: mine ? 'var(--volt)' : 'var(--surface-low)',
                color: mine ? 'var(--accent-contrast)' : 'var(--text)',
              }}
            >
              {message.body}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </section>
      {canWrite ? (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSend();
          }}
        >
          <input
            aria-label="Mensaje"
            className="h-11 flex-1 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-low)] px-3 text-sm text-[var(--text)] focus:border-[var(--volt)] focus:outline-none"
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Escribe un mensaje…"
            value={draft}
          />
          <Button disabled={!draft.trim()} loading={sending} type="submit" variant="primary">
            <Send className="size-4" />
          </Button>
        </form>
      ) : (
        <p className="text-center text-sm text-[var(--text-muted)]">
          Esta conversación es de solo lectura.
        </p>
      )}
    </div>
  );
}
