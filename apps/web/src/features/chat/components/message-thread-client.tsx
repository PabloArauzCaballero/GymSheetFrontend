'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useEffect, useRef, useState } from 'react';
import { useChatThread } from '@/features/chat/hooks/use-chat-thread';
import { dayDividerLabel } from '@/features/chat/lib/chat-time';
import { canEditMessage } from '@/features/chat/lib/message-edit';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import {
  SkeletonPageHeader,
  SkeletonScreen,
  SkeletonThread,
} from '@/shared/components/feedback/skeleton';
import { DomainImage } from '@/shared/components/media/domain-image';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import { MessageBubble } from './message-bubble';
import { MessageComposer } from './message-composer';
import { ThreadHeader } from './thread-header';

function sameDay(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10);
}

/**
 * Un hilo de chat.
 *
 * Lo que había aquí era un hilo de texto plano: burbujas con `body`, sin
 * cabecera de la otra persona, sin presencia, sin checks de entregado o leído,
 * sin paginación, sin adjuntos ni ubicación, sin apodo. Todo eso existe en el
 * backend —`/messages/media`, `/view`, `/nickname`, `/read`, los eventos
 * `presence:update`, `message:delivered` y `message:read`— y lo consumía sólo el
 * móvil. Esta pantalla lo iguala endpoint por endpoint.
 *
 * Aquí sólo vive el maquetado; la conversación como dato está en
 * `useChatThread`.
 */
export function MessageThreadClient({
  conversationId,
  currentUserId,
  socketOrigin,
  storyReplyMessageId,
}: Readonly<{ conversationId: string; currentUserId: string; socketOrigin: string; storyReplyMessageId?: string }>) {
  const thread = useChatThread({ conversationId, socketOrigin });
  const {
    conversationUnavailable,
    hasMoreOlder,
    history,
    isValidatingHistory,
    loadOlderMessages,
    loadingOlder,
    messages,
  } = thread;
  const bottomRef = useRef<HTMLDivElement>(null);
  const replySearchRef = useRef<{ id: string; pages: number; before: string | null } | null>(null);
  const [replyTargetStatus, setReplyTargetStatus] = useState('');
  const [imageViewer, setImageViewer] = useState<{ messageId: string; url: string } | null>(null);
  if (
    imageViewer &&
    (
      thread.conversationUnavailable ||
      thread.isValidatingHistory ||
      thread.isMessageDeleted(imageViewer.messageId)
    )
  ) {
    setImageViewer(null);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.latestMessageId]);

  useEffect(() => {
    if (!storyReplyMessageId) {
      replySearchRef.current = null;
      return;
    }
    let search = replySearchRef.current;
    if (!search || search.id !== storyReplyMessageId) {
      search = { id: storyReplyMessageId, pages: 0, before: null };
      replySearchRef.current = search;
      setReplyTargetStatus('Buscando la respuesta a la story…');
    }
    if (history.isLoading || isValidatingHistory || conversationUnavailable) return;

    const target = messages.find((message) => message.id === storyReplyMessageId);
    if (target) {
      const element = document.getElementById(`message-${storyReplyMessageId}`);
      if (!element) return;
      replySearchRef.current = null;
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus({ preventScroll: true });
      return;
    }

    if (loadingOlder) return;
    const before = messages[0]?.createdAt ?? null;
    if (!hasMoreOlder || !before || search.pages >= 20 || search.before === before) {
      setReplyTargetStatus('No se encontró la respuesta a la story en las páginas de historial consultadas.');
      return;
    }
    search.pages += 1;
    search.before = before;
    setReplyTargetStatus('Buscando la respuesta a la story en mensajes anteriores…');
    void loadOlderMessages();
  }, [
    storyReplyMessageId,
    conversationUnavailable,
    hasMoreOlder,
    history.isLoading,
    isValidatingHistory,
    loadOlderMessages,
    loadingOlder,
    messages,
  ]);

  if (thread.history.isLoading) {
    return (
      <SkeletonScreen className="gap-6" label="Cargando la conversación">
        <SkeletonPageHeader />
        <SkeletonThread />
      </SkeletonScreen>
    );
  }
  if (thread.isValidatingHistory) {
    return (
      <div className="mx-auto grid w-full max-w-3xl gap-5">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
          href="/chat"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Mensajes
        </Link>
        <p className="p-5 text-center text-sm text-[var(--text-muted)]" role="status">
          Verificando disponibilidad de la conversación…
        </p>
      </div>
    );
  }
  if (thread.conversationUnavailable) {
    return (
      <div className="mx-auto grid w-full max-w-3xl gap-5">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
          href="/chat"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Mensajes
        </Link>
        <p className="rounded-[8px] border border-[var(--border-subtle)] p-5 text-center text-sm text-[var(--text-muted)]" role="alert">
          Esta conversación ya no está disponible.
        </p>
      </div>
    );
  }
  if (thread.history.isError) {
    return (
      <ErrorPanel message={thread.history.error.message} onRetry={() => thread.history.refetch()} />
    );
  }

  const canWrite = thread.conversation?.canWrite !== false && !thread.conversationRevoked;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5">
      <Link
        className="inline-flex w-fit items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
        href="/chat"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Mensajes
      </Link>

      <ThreadHeader
        connectionState={thread.connectionState}
        conversation={thread.conversation}
        onSaveNickname={(nickname) => thread.setNickname.mutate(nickname)}
        otherLastSeenAt={thread.otherLastSeenAt}
        otherOnline={thread.otherOnline}
        savingNickname={thread.setNickname.isPending}
      />

      {/* `role="log"` trae de serie `aria-live="polite"` + `aria-relevant="additions"`,
          que es justo lo que pide un chat: anuncia el mensaje que ENTRA sin releer
          todo el hilo. */}
      <section
        aria-label="Mensajes"
        className="panel flex max-h-[60vh] flex-col overflow-y-auto p-4"
        role="log"
      >
        {storyReplyMessageId && replyTargetStatus && !messages.some((message) => message.id === storyReplyMessageId) ? (
          <p aria-live="polite" className="mb-2 text-center text-xs text-[var(--text-muted)]" role="status">
            {replyTargetStatus}
          </p>
        ) : null}
        {thread.hasMoreOlder ? (
          <Button
            className="mb-2 self-center"
            loading={thread.loadingOlder}
            onClick={() => void thread.loadOlderMessages()}
            size="sm"
            variant="ghost"
          >
            Ver mensajes anteriores
          </Button>
        ) : null}

        {thread.messages.length === 0 ? (
          <p className="m-auto max-w-xs py-8 text-center text-sm leading-6 text-[var(--text-muted)]">
            {thread.conversationRevoked
              ? 'El historial y los archivos de esta conversación ya no están disponibles.'
              : 'Aún no hay mensajes. Escribe el primero y empieza la conversación.'}
          </p>
        ) : null}

        <ul className="flex flex-col">
          {thread.messages.map((message, index) => {
            const previous = thread.messages[index - 1];
            const startsDay = !previous || !sameDay(previous.createdAt, message.createdAt);
            return (
              <Fragment key={message.id}>
                {startsDay ? <DayDivider iso={message.createdAt} /> : null}
                <MessageBubble
                  groupedWithPrevious={
                    !startsDay && message.type !== 'system' && previous?.type !== 'system' && previous?.senderId === message.senderId
                  }
                  message={message}
                  focusedForStoryReply={storyReplyMessageId === message.id}
                  mine={message.senderId === currentUserId}
                  canEdit={
                    !thread.conversationRevoked &&
                    thread.conversation?.canWrite !== false &&
                    canEditMessage(message, currentUserId)
                  }
                  onEditMessage={(messageId, body) => thread.editMessage?.mutate({ messageId, body })}
                  editPending={thread.editMessage?.isPending}
                  onOpenImage={(url) => {
                    if (!thread.isMessageDeleted(message.id)) setImageViewer({ messageId: message.id, url });
                  }}
                  onRevealViewOnce={(messageId) =>
                    thread.revealViewOnce.mutate(messageId, {
                      // La foto revelada se abre en grande al momento: es de
                      // vista única, así que no habrá una segunda oportunidad
                      // de pulsarla.
                      onSuccess: (revealed) => {
                        if (
                          revealed.type === 'image' &&
                          revealed.mediaUrl &&
                          !thread.isMessageDeleted(messageId)
                        ) {
                          setImageViewer({ messageId, url: revealed.mediaUrl });
                        }
                      },
                    })
                  }
                  otherLastDeliveredAt={thread.otherLastDeliveredAt}
                  otherLastReadAt={thread.otherLastReadAt}
                  otherReadReceiptsSinceAt={thread.otherReadReceiptsSinceAt}
                  revealPending={thread.revealViewOnce.isPending}
                  revealedUrl={thread.revealedMedia[message.id] ?? null}
                />
              </Fragment>
            );
          })}
        </ul>
        <div ref={bottomRef} />
      </section>

      {canWrite ? (
        <MessageComposer
          onSendLocation={thread.sendLocation}
          onSendMedia={(file, viewOnce) => void thread.sendMedia(file, viewOnce)}
          onSendText={(body) => void thread.sendText(body)}
          sending={thread.sending}
          sendingMedia={thread.sendingMedia}
        />
      ) : (
        <p className="text-center text-sm text-[var(--text-muted)]">
          Esta conversación es de solo lectura.
        </p>
      )}

      <Dialog
        onOpenChange={(open) => !open && setImageViewer(null)}
        open={Boolean(imageViewer && !thread.conversationRevoked && !thread.isMessageDeleted(imageViewer.messageId))}
      >
        <DialogContent className="max-w-2xl" title="Foto">
          {imageViewer && !thread.conversationRevoked && !thread.isMessageDeleted(imageViewer.messageId) ? (
            <div className="max-h-[70vh] overflow-hidden rounded-[var(--radius-lg)]">
              <DomainImage alt="Foto del mensaje" className="object-contain" src={imageViewer.url} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DayDivider({ iso }: Readonly<{ iso: string }>) {
  return (
    <li className="my-4 flex items-center gap-3 self-stretch text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
      <span aria-hidden className="h-px flex-1 bg-[var(--border-subtle)]" />
      {dayDividerLabel(iso)}
      <span aria-hidden className="h-px flex-1 bg-[var(--border-subtle)]" />
    </li>
  );
}
