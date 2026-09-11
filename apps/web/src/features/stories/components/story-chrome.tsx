'use client';

import { Eye, Pause, Play, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { StoryFeedEntry } from '@/shared/api/schemas';
import { PersonAvatar } from '@/shared/components/media/person-avatar';
import { formatRelativeTime } from '@/shared/lib/relative-time';

/**
 * El cromo del visor: barras, cabecera y acciones del autor.
 *
 * Vive aparte del visor porque el visor ya carga con lo difícil —el reloj, el
 * gesto y la navegación— y mezclarlo con el maquetado convertía ese fichero en
 * un sitio donde da miedo tocar nada.
 */

export function ChromeButton({
  children,
  className,
  label,
  onClick,
}: Readonly<{
  children: ReactNode;
  className?: string;
  label: string;
  onClick: () => void;
}>) {
  return (
    <button
      aria-label={label}
      className={`tap z-10 grid size-11 shrink-0 place-items-center rounded-full border border-white/25 bg-[rgb(var(--scrim-channels)/0.45)] text-white ${className ?? ''}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

/** Barras segmentadas: una por story, la actual llenándose. */
function ProgressBars({
  progress,
  storyIndex,
  stories,
}: Readonly<{ progress: number; storyIndex: number; stories: StoryFeedEntry['stories'] }>) {
  return (
    <div aria-hidden className="flex gap-1">
      {stories.map((item, position) => (
        <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/30" key={item.id}>
          <span
            className="block h-full rounded-full bg-white"
            style={{
              width:
                position < storyIndex
                  ? '100%'
                  : position === storyIndex
                    ? `${Math.round(progress * 100)}%`
                    : '0%',
            }}
          />
        </span>
      ))}
    </div>
  );
}

export function StoryTopBar({
  createdAt,
  entry,
  isVideo,
  muted,
  onClose,
  onToggleMuted,
  onTogglePaused,
  paused,
  progress,
  storyIndex,
}: Readonly<{
  createdAt: string;
  entry: StoryFeedEntry;
  isVideo: boolean;
  muted: boolean;
  onClose: () => void;
  onToggleMuted: () => void;
  onTogglePaused: () => void;
  paused: boolean;
  progress: number;
  storyIndex: number;
}>) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 grid gap-3 bg-gradient-to-b from-[rgb(var(--scrim-channels)/0.75)] to-transparent p-4 pb-10">
      <ProgressBars progress={progress} storyIndex={storyIndex} stories={entry.stories} />
      <div className="pointer-events-auto flex items-center gap-3">
        <PersonAvatar name={entry.fullName} photoUrl={entry.photoUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{entry.fullName}</p>
          <p className="text-xs text-white/70">{formatRelativeTime(createdAt)}</p>
        </div>
        {/* La pausa también es un botón, no sólo «mantener pulsado»: un gesto
            que no se ve no es un control para quien no lo conoce. */}
        <ChromeButton label={paused ? 'Reanudar' : 'Pausar'} onClick={onTogglePaused}>
          {paused ? (
            <Play aria-hidden className="size-5" />
          ) : (
            <Pause aria-hidden className="size-5" />
          )}
        </ChromeButton>
        {isVideo ? (
          <ChromeButton
            label={muted ? 'Activar el sonido' : 'Silenciar'}
            onClick={onToggleMuted}
          >
            {muted ? (
              <VolumeX aria-hidden className="size-5" />
            ) : (
              <Volume2 aria-hidden className="size-5" />
            )}
          </ChromeButton>
        ) : null}
        <ChromeButton label="Cerrar" onClick={onClose}>
          <X aria-hidden className="size-5" />
        </ChromeButton>
      </div>
    </div>
  );
}

/** Sólo sobre una story propia: quién la vio y borrarla. */
export function StoryOwnerBar({
  onDelete,
  onShowViewers,
}: Readonly<{ onDelete: () => void; onShowViewers: () => void }>) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-[rgb(var(--scrim-channels)/0.75)] to-transparent p-4 pt-10">
      <button
        className="tap inline-flex min-h-11 items-center gap-2 rounded-full border border-white/30 px-4 text-sm font-semibold text-white"
        onClick={onShowViewers}
        type="button"
      >
        <Eye aria-hidden className="size-4" />
        Ver quién la vio
      </button>
      <ChromeButton label="Eliminar esta story" onClick={onDelete}>
        <Trash2 aria-hidden className="size-5" />
      </ChromeButton>
    </div>
  );
}
