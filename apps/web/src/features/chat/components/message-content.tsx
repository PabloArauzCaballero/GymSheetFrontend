'use client';

import { Eye, EyeOff, MapPin, PlayCircle } from 'lucide-react';
import type { Message } from '@/shared/api/schemas';
import { DomainImage, mediaProxyUrl } from '@/shared/components/media/domain-image';
import { cn } from '@/shared/lib/cn';

export function mapsUrlFor(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function MessageContent({
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

  if (message.type === 'location' && message.locationLat !== null && message.locationLng !== null) {
    return (
      <a
        className="flex items-center gap-2 underline-offset-2 hover:underline"
        href={mapsUrlFor(message.locationLat, message.locationLng)}
        rel="noreferrer noopener"
        target="_blank"
      >
        <MapPin aria-hidden className="size-5 shrink-0" />
        <span className="grid">
          <span className="text-sm font-semibold">
            {message.locationLabel ?? 'Ubicación compartida'}
          </span>
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
      if (mine)
        return <span className={cn('text-sm', mutedClass)}>Audio enviado — vista única</span>;
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
