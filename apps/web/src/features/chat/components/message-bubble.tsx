'use client';

import { Check, CheckCheck, Eye, EyeOff, MapPin, PlayCircle } from 'lucide-react';
import type { Message } from '@/shared/api/schemas';
import { DomainImage, mediaProxyUrl } from '@/shared/components/media/domain-image';
import { cn } from '@/shared/lib/cn';
import { formatTimeOfDay } from '@/features/chat/lib/chat-time';

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
}>) {
  const read = mine && otherLastReadAt !== null && message.createdAt <= otherLastReadAt;
  const delivered =
    mine && otherLastDeliveredAt !== null && message.createdAt <= otherLastDeliveredAt;
  const TickIcon = delivered ? CheckCheck : Check;

  return (
    <li
      className={cn(
        'flex max-w-[80%] flex-col gap-1 rounded-[var(--radius-lg)] px-3.5 py-2.5',
        // El vértice pegado a quien envía se achata — es lo mínimo que hace
        // falta para leer «burbuja de chat» en vez de «tarjeta».
        mine
          ? 'self-end rounded-br-[4px] bg-[var(--volt)] text-[var(--accent-contrast)]'
          : 'self-start rounded-bl-[4px] bg-[var(--surface-low)] text-[var(--text)]',
        groupedWithPrevious ? 'mt-1' : 'mt-3',
      )}
    >
      <MessageContent
        message={message}
        mine={mine}
        onOpenImage={onOpenImage}
        onRevealViewOnce={onRevealViewOnce}
        revealPending={revealPending}
        revealedUrl={revealedUrl}
      />
      <span
        className={cn(
          'flex items-center gap-1 self-end text-[10px]',
          mine ? 'opacity-70' : 'text-[var(--text-muted)]',
        )}
      >
        {formatTimeOfDay(message.createdAt)}
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
