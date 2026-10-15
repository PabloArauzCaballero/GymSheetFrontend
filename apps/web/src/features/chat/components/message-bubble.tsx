'use client';

import {
  Check,
  CheckCheck,
  Eye,
  EyeOff,
  Flag,
  MapPin,
  MoreHorizontal,
  PlayCircle,
} from 'lucide-react';
import { useState } from 'react';
import type { Message } from '@/shared/api/schemas';
import { isMessageReadByOther, trainingInviteAcceptedMessage } from '@gymsheet/domain';
import { DomainImage, mediaProxyUrl } from '@/shared/components/media/domain-image';
import { cn } from '@/shared/lib/cn';
import { formatTimeOfDay } from '@/features/chat/lib/chat-time';
import { ReportDialog } from '@/features/moderation/components/report-dialog';

export function mapsUrlFor(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * Una burbuja del hilo.
 *
 * El marco —fondo, radios, hora y checks— es igual para los cuatro tipos de
 * mensaje que el contrato admite; lo único que cambia es el contenido. La web
 * pintaba sólo `body`, así que una foto, un vídeo o una ubicación llegaban como
 * una burbuja vacía.
 *
 * Los checks salen de comparar la fecha del mensaje propio contra los cursores
 * del otro participante (`otherUserLastDeliveredAt` / `…ReadAt`). No hay estado
 * por mensaje que mantener: dos marcas de tiempo describen el hilo entero.
 */
export function MessageBubble({
  groupedWithPrevious,
  message,
  mine,
  onOpenImage,
  onRevealViewOnce,
  revealedUrl,
  revealPending,
  otherLastDeliveredAt,
  otherLastReadAt,
  otherReadReceiptsSinceAt,
  canEdit,
  onEditMessage,
  editPending,
  focusedForStoryReply = false,
}: Readonly<{
  groupedWithPrevious: boolean;
  message: Message;
  mine: boolean;
  onOpenImage: (url: string) => void;
  onRevealViewOnce: (messageId: string) => void;
  revealedUrl: string | null;
  revealPending: boolean;
  otherLastDeliveredAt: string | null;
  otherLastReadAt: string | null;
  otherReadReceiptsSinceAt: string | null;
  canEdit: boolean;
  onEditMessage: (messageId: string, body: string) => void;
  editPending?: boolean;
  focusedForStoryReply?: boolean;
}>) {
  const [editMenuOpen, setEditMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.body ?? '');
  const read = mine && isMessageReadByOther(message.createdAt, otherLastReadAt, otherReadReceiptsSinceAt);
  const delivered =
    mine && otherLastDeliveredAt !== null && message.createdAt <= otherLastDeliveredAt;
  const TickIcon = delivered ? CheckCheck : Check;

  if (message.type === 'system') {
    return (
      <li
        aria-label={trainingInviteAcceptedMessage(message.systemEvent)}
        className="my-3 flex w-full justify-center px-2 text-center text-xs leading-5 text-[var(--text-muted)]"
        id={`message-${message.id}`}
        role="status"
        tabIndex={-1}
      >
        {trainingInviteAcceptedMessage(message.systemEvent)}
      </li>
    );
  }

  return (
    <li
      className={cn(
        'flex max-w-[80%] flex-col gap-1 rounded-[var(--radius-lg)] px-3.5 py-2.5',
        focusedForStoryReply && 'ring-2 ring-[var(--focus-ring)]',
        // El vértice pegado a quien envía se achata — es lo mínimo que hace
        // falta para leer «burbuja de chat» en vez de «tarjeta».
        mine
          ? 'self-end rounded-br-[4px] bg-[var(--volt)] text-[var(--accent-contrast)]'
          : 'self-start rounded-bl-[4px] bg-[var(--surface-low)] text-[var(--text)]',
        groupedWithPrevious ? 'mt-1' : 'mt-3',
      )}
      id={`message-${message.id}`}
      tabIndex={-1}
    >
      {message.storyReference ? (
        <span aria-label="Referencia a una story" className="text-xs font-medium opacity-75">
          {message.storyReference.available ? 'Respuesta a una story' : 'Historia no disponible'}
        </span>
      ) : null}
      {editing ? (
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const body = draft.trim();
            if (!body || body === message.body) return;
            onEditMessage(message.id, body);
            setEditing(false);
          }}
        >
          <textarea
            aria-label="Editar mensaje"
            autoFocus
            className="min-w-64 rounded-[var(--radius-md)] border border-current/30 bg-transparent p-2 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            maxLength={4000}
            onChange={(event) => setDraft(event.target.value)}
            value={draft}
          />
          <span className="flex justify-end gap-2">
            <button
              className="rounded px-2 py-1 text-xs underline-offset-2 hover:underline"
              disabled={editPending}
              onClick={() => setEditing(false)}
              type="button"
            >Cancelar</button>
            <button
              className="rounded px-2 py-1 text-xs font-semibold underline-offset-2 hover:underline disabled:opacity-60"
              disabled={editPending || !draft.trim() || draft.trim() === message.body}
              type="submit"
            >Guardar edición</button>
          </span>
        </form>
      ) : (
        <MessageContent
          message={message}
          mine={mine}
          onOpenImage={onOpenImage}
          onRevealViewOnce={onRevealViewOnce}
          revealPending={revealPending}
          revealedUrl={revealedUrl}
        />
      )}
      <span
        className={cn(
          'flex items-center gap-1 self-end text-[10px]',
          mine ? 'opacity-70' : 'text-[var(--text-muted)]',
        )}
      >
        {formatTimeOfDay(message.createdAt)}
        {message.editedAt ? <span aria-label="Mensaje editado">Editado</span> : null}
        {canEdit && !editing ? (
          <span className="relative">
            <button
              aria-expanded={editMenuOpen}
              aria-label="Más opciones del mensaje"
              className="rounded p-1 hover:bg-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
              onClick={() => setEditMenuOpen((open) => !open)}
              type="button"
            >
              <MoreHorizontal aria-hidden className="size-3.5" />
            </button>
            {editMenuOpen ? (
              <span className="absolute bottom-full right-0 z-10 rounded-[var(--radius-md)] bg-[var(--surface-high)] p-1 shadow-lg">
                <button
                  className="whitespace-nowrap rounded px-3 py-2 text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-low)]"
                  onClick={() => {
                    setDraft(message.body ?? '');
                    setEditing(true);
                    setEditMenuOpen(false);
                  }}
                  type="button"
                >Editar</button>
              </span>
            ) : null}
          </span>
        ) : null}
        {mine ? (
          <TickIcon
            aria-label={read ? 'Leído' : delivered ? 'Entregado' : 'Enviado'}
            className="size-3.5"
            /* El check de leído se pinta con el tono informativo del inquilino.
               La convención universal es que sea azul, y `--info-text` lo es en
               las dos paletas; fijar aquí el azul de otra aplicación sería
               clavar en el código un color que este proyecto hace configurable. */
            style={read ? { color: 'var(--info-text)' } : undefined}
          />
        ) : null}
      </span>
      {!mine && !message.deletedAt ? (
        <ReportDialog
          subjectName="este mensaje"
          targetId={message.id}
          targetKind="CHAT_MESSAGE"
          trigger={
            <button
              aria-label="Reportar mensaje"
              className="min-h-11 self-end rounded px-2 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-high)] hover:text-[var(--text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
              type="button"
            >
              <Flag aria-hidden className="mr-1 inline size-3.5" /> Reportar
            </button>
          }
        />
      ) : null}
    </li>
  );
}

function MessageContent({
  message,
  mine,
  onOpenImage,
  onRevealViewOnce,
  revealPending,
  revealedUrl,
}: Readonly<{
  message: Message;
  mine: boolean;
  onOpenImage: (url: string) => void;
  onRevealViewOnce: (messageId: string) => void;
  revealPending: boolean;
  revealedUrl: string | null;
}>) {
  const mutedClass = mine ? 'opacity-75' : 'text-[var(--text-muted)]';

  if (
    message.type === 'location' &&
    message.locationLat !== null &&
    message.locationLng !== null
  ) {
    return (
      <a
        className="flex items-center gap-2 underline-offset-2 hover:underline"
        href={mapsUrlFor(message.locationLat, message.locationLng)}
        rel="noreferrer noopener"
        target="_blank"
      >
        <MapPin aria-hidden className="size-5 shrink-0" />
        <span className="grid">
          <span className="text-sm font-semibold">Ubicación compartida</span>
          <span className={cn('text-xs', mutedClass)}>Ábrela en el mapa</span>
        </span>
      </a>
    );
  }

  if (message.type === 'audio') {
    const url = revealedUrl ?? message.mediaUrl;
    const alreadyViewed = message.viewOnce && message.viewed && !revealedUrl;

    if (alreadyViewed) {
      return <span className={cn('text-sm', mutedClass)}>Audio escuchado</span>;
    }

    if (message.viewOnce && !url) {
      if (mine) return <span className={cn('text-sm', mutedClass)}>Audio enviado — vista única</span>;
      return (
        <button
          className="flex items-center gap-2 text-sm font-semibold underline-offset-2 hover:underline disabled:opacity-60"
          disabled={revealPending}
          onClick={() => onRevealViewOnce(message.id)}
          type="button"
        >
          <PlayCircle aria-hidden className="size-4" />
          Escuchar una vez
        </button>
      );
    }

    if (!url) return <span className={cn('text-sm', mutedClass)}>Audio no disponible.</span>;

    return (
      <span className="grid gap-2">
        <audio
          aria-label="Reproducir mensaje de audio"
          className="max-w-64"
          controls
          preload="metadata"
          src={mediaProxyUrl(url)}
        >
          Tu navegador no puede reproducir este audio.
        </audio>
        {message.body ? <span className="text-sm">{message.body}</span> : null}
      </span>
    );
  }

  if (message.type === 'image' || message.type === 'video') {
    const url = revealedUrl ?? message.mediaUrl;
    const alreadyViewed = message.viewOnce && message.viewed && !revealedUrl;

    if (alreadyViewed) {
      return (
        <span className={cn('flex items-center gap-2 text-sm', mutedClass)}>
          <EyeOff aria-hidden className="size-4" />
          {message.type === 'image' ? 'Foto vista' : 'Vídeo visto'}
        </span>
      );
    }

    if (message.viewOnce && !url) {
      // Quien envía no puede abrir su propia vista única: el backend lo rechaza,
      // así que ofrecerle un botón sería ofrecerle un error.
      if (mine) {
        return (
          <span className={cn('flex items-center gap-2 text-sm', mutedClass)}>
            <Eye aria-hidden className="size-4" />
            {message.type === 'image'
              ? 'Foto enviada — vista única'
              : 'Vídeo enviado — vista única'}
          </span>
        );
      }
      return (
        <button
          className="flex items-center gap-2 text-sm font-semibold underline-offset-2 hover:underline disabled:opacity-60"
          disabled={revealPending}
          onClick={() => onRevealViewOnce(message.id)}
          type="button"
        >
          <Eye aria-hidden className="size-4" />
          Verla una vez
        </button>
      );
    }

    if (!url) {
      return <span className={cn('text-sm', mutedClass)}>Contenido no disponible.</span>;
    }

    if (message.type === 'video') {
      return (
        <span className="grid gap-2">
          <video
            className="max-h-72 w-full max-w-64 rounded-[var(--radius-md)] bg-black"
            controls
            preload="metadata"
            src={mediaProxyUrl(url)}
          >
            <a href={mediaProxyUrl(url)} rel="noreferrer noopener" target="_blank">
              <PlayCircle aria-hidden className="size-6" />
              Abrir el vídeo
            </a>
          </video>
          {message.body ? <span className="text-sm">{message.body}</span> : null}
        </span>
      );
    }

    return (
      <span className="grid gap-2">
        <button
          className="block w-56 overflow-hidden rounded-[var(--radius-md)]"
          onClick={() => onOpenImage(url)}
          type="button"
        >
          <span className="block aspect-square">
            <DomainImage alt="Foto del mensaje" src={url} />
          </span>
        </button>
        {message.body ? <span className="text-sm">{message.body}</span> : null}
      </span>
    );
  }

  return <span className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</span>;
}
