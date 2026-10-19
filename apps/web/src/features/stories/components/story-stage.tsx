'use client';

import type { RefObject } from 'react';
import { useRef } from 'react';
import type { StoryFeedEntry } from '@/shared/api/schemas';
import { DomainImage, mediaProxyUrl } from '@/shared/components/media/domain-image';

/** Por debajo de esto, el gesto fue un toque; por encima, fue mantener pulsado. */
const TAP_MAX_MS = 250;

/**
 * La superficie de la story: imagen o vídeo, más los gestos. Un toque en el
 * tercio izquierdo vuelve, en el resto avanza, y mantener pulsado pausa.
 */
export function StoryStage({
  fullName,
  muted,
  onHold,
  onNext,
  onPrevious,
  onVideoDuration,
  story,
  videoRef,
}: Readonly<{
  fullName: string;
  muted: boolean;
  onHold: (held: boolean) => void;
  onNext: () => void;
  onPrevious: () => void;
  onVideoDuration: (ms: number) => void;
  story: StoryFeedEntry['stories'][number];
  videoRef: RefObject<HTMLVideoElement | null>;
}>) {
  const pressRef = useRef<{ at: number } | null>(null);

  return (
    <div
      className="absolute inset-0"
      onPointerCancel={() => onHold(false)}
      onPointerDown={() => {
        pressRef.current = { at: Date.now() };
        onHold(true);
      }}
      onPointerLeave={() => onHold(false)}
      onPointerUp={(event) => {
        onHold(false);
        const press = pressRef.current;
        pressRef.current = null;
        if (!press || Date.now() - press.at >= TAP_MAX_MS) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX - bounds.left < bounds.width * 0.33) onPrevious();
        else onNext();
      }}
    >
      {story.mediaType === 'video' ? (
        <video
          aria-label={`Story de ${fullName}`}
          autoPlay
          className="size-full object-contain"
          muted={muted}
          onEnded={onNext}
          onLoadedMetadata={(event) => {
            const seconds = event.currentTarget.duration;
            if (Number.isFinite(seconds) && seconds > 0) {
              onVideoDuration(seconds * 1_000);
            }
          }}
          playsInline
          ref={videoRef}
          src={mediaProxyUrl(story.mediaUrl)}
        />
      ) : (
        <DomainImage alt={`Story de ${fullName}`} className="object-contain" src={story.mediaUrl} />
      )}
      {story.caption ? (
        <p className="pointer-events-none absolute inset-x-6 bottom-28 mx-auto w-fit max-w-full whitespace-pre-line rounded-[var(--radius-lg)] bg-[rgb(var(--scrim-channels)/0.6)] px-4 py-2 text-center text-base font-semibold text-white">
          {story.caption}
        </p>
      ) : null}
    </div>
  );
}
