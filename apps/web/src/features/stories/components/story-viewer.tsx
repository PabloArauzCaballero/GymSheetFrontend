'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { StoryFeedEntry } from '@/shared/api/schemas';
import { confirmDelete, notify } from '@/shared/notifications';
import { storiesService, storyKeys } from '@/features/stories/services/stories-service';
import { useStoryReply } from '@/features/stories/hooks/use-story-reply';
import { useStoryProgress } from '@/features/stories/hooks/use-story-progress';
import { usePagePlaybackPause } from '@/features/stories/hooks/use-page-playback-pause';
import { locateStoryInFeed } from '@/features/stories/lib/story-feed-location';
import { StoryStage } from './story-stage';
import { StoryReplyBar } from './story-reply-bar';
import { ChromeButton, StoryOwnerBar, StoryTopBar } from './story-chrome';
import { StoryViewersPanel } from './story-viewers-panel';

/** Lo que dura una foto en pantalla. Un video dura lo que dure el video. */
const IMAGE_DURATION_MS = 5_000;
/**
 * Si el navegador no sabe cuánto dura el video, no se queda ahí para siempre.
 * El mismo número que `apps/mobile/src/components/story-viewer.tsx`: ante un
 * clip que no declara duración, las dos plataformas enseñan el mismo tramo.
 */
const VIDEO_FALLBACK_MS = 15_000;

/**
 * Visor de stories a pantalla completa.
 *
 * Reglas del formato, todas tomadas de lo que la gente ya espera: barras
 * segmentadas arriba (una por story), avance automático, toque a la derecha
 * para saltar y a la izquierda para volver, y mantener pulsado para pausar.
 * El teclado tiene su propio camino —flechas, espacio y Escape— porque un
 * visor que sólo entiende dedos deja fuera a media plataforma.
 */
export function StoryViewer({
  entries,
  onClose,
  ownUserId,
  startUserId,
}: Readonly<{
  entries: StoryFeedEntry[];
  onClose: () => void;
  ownUserId: string;
  startUserId: string;
}>) {
  const queryClient = useQueryClient();
  const [userIndex, setUserIndex] = useState(() =>
    Math.max(
      0,
      entries.findIndex((entry) => entry.userId === startUserId),
    ),
  );
  const [storyIndex, setStoryIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const { paused: pausedAfterBackground, resume: resumeAfterBackground } = usePagePlaybackPause();
  const [muted, setMuted] = useState(true);
  const [showViewers, setShowViewers] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  // La duración se guarda junto a la story que la produjo: así, al cambiar de
  // story, deja de aplicarse en el mismo render, sin un efecto que la limpie.
  const [videoDuration, setVideoDuration] = useState<{ storyId: string; ms: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const viewedRef = useRef(new Set<string>());
  const activeStoryIdRef = useRef<string | null>(null);
  const previousEntriesRef = useRef(entries);

  const entry = entries[userIndex];
  const story = entry?.stories[storyIndex];
  useEffect(() => {
    const feedChanged = previousEntriesRef.current !== entries;
    previousEntriesRef.current = entries;
    const activeStoryId = activeStoryIdRef.current;

    if (feedChanged && activeStoryId) {
      const position = locateStoryInFeed(entries, activeStoryId);
      if (!position) {
        onClose();
        return;
      }
      if (story?.id !== activeStoryId) {
        setUserIndex(position.userIndex);
        setStoryIndex(position.storyIndex);
        return;
      }
    }

    activeStoryIdRef.current = story?.id ?? null;
  }, [entries, onClose, story?.id]);
  const isOwn = entry?.userId === ownUserId;

  const goNext = useCallback(() => {
    setShowViewers(false);
    const current = entries[userIndex];
    if (current && storyIndex + 1 < current.stories.length) {
      setStoryIndex(storyIndex + 1);
      return;
    }
    if (userIndex + 1 < entries.length) {
      setUserIndex(userIndex + 1);
      setStoryIndex(0);
      return;
    }
    onClose();
  }, [entries, onClose, storyIndex, userIndex]);

  const goPrevious = useCallback(() => {
    setShowViewers(false);
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
      return;
    }
    if (userIndex > 0) {
      const previous = entries[userIndex - 1];
      setUserIndex(userIndex - 1);
      setStoryIndex(Math.max(0, (previous?.stories.length ?? 1) - 1));
    }
  }, [entries, storyIndex, userIndex]);

  const measuredMs = videoDuration && videoDuration.storyId === story?.id ? videoDuration.ms : null;
  const durationMs =
    story?.mediaType === 'video' ? (measuredMs ?? VIDEO_FALLBACK_MS) : IMAGE_DURATION_MS;
  const progress = useStoryProgress({
    activeKey: story?.id ?? 'none',
    durationMs,
    paused: held || pausedAfterBackground || showViewers || !story,
    onComplete: goNext,
  });

  const markViewed = useMutation({
    mutationFn: (storyId: string) => storiesService.view(storyId),
    // Un fallo al registrar la vista no puede interrumpir la reproducción: el
    // anillo se quedará encendido y se reintentará la próxima vez.
    onError: () => undefined,
  });

  const removeStory = useMutation({
    mutationFn: (storyId: string) => storiesService.remove(storyId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: storyKeys.feed });
      notify.success('Story eliminada.');
      onClose();
    },
    onError: (error: Error) => notify.error(error),
  });

  const reply = useStoryReply({ story, isOwn, onClose });

  // Registrar la vista una sola vez por story y sesión de visor.
  useEffect(() => {
    if (!story || story.viewedByMe || isOwn) return;
    if (viewedRef.current.has(story.id)) return;
    viewedRef.current.add(story.id);
    markViewed.mutate(story.id);
  }, [isOwn, markViewed, story]);

  // El video manda sobre la pausa: si el reloj se detiene, la imagen también.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (held || pausedAfterBackground || showViewers) video.pause();
    else void video.play().catch(() => undefined);
  }, [held, pausedAfterBackground, showViewers, story?.id]);

  // Al abrirse, el foco entra en el visor: si se quedara en el botón que hay
  // debajo, tabular llevaría por la página oculta detrás del overlay.
  useEffect(() => {
    surfaceRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (replyOpen) {
        if (event.key === 'Escape') {
          setReplyOpen(false);
          setHeld(false);
        }
        return;
      }
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowRight') goNext();
      else if (event.key === 'ArrowLeft') goPrevious();
      else if (event.key === ' ') {
        event.preventDefault();
        setHeld((value) => !value);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [goNext, goPrevious, onClose, replyOpen]);

  if (!entry || !story) return null;

  return (
    <div
      aria-label={`Stories de ${entry.fullName}`}
      aria-modal="true"
      className="fixed inset-0 z-50 grid touch-manipulation place-items-center overscroll-contain bg-[rgb(var(--scrim-channels)/0.94)] p-0 sm:p-6"
      onClick={(event) => {
        // Sólo el fondo cierra; un clic dentro de la story no debe sacar de ella.
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
    >
      <div
        className="relative h-dvh w-full max-w-md overflow-hidden bg-[var(--surface-lowest)] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] focus:outline-none sm:h-[85dvh] sm:rounded-[var(--radius-xl)] sm:p-0"
        ref={surfaceRef}
        tabIndex={-1}
      >
        <StoryStage
          fullName={entry.fullName}
          muted={muted}
          onHold={setHeld}
          onNext={goNext}
          onPrevious={goPrevious}
          onVideoDuration={(ms) => setVideoDuration({ storyId: story.id, ms })}
          story={story}
          videoRef={videoRef}
        />

        <StoryTopBar
          createdAt={story.createdAt}
          entry={entry}
          isVideo={story.mediaType === 'video'}
          muted={muted}
          onClose={onClose}
          onToggleMuted={() => setMuted((value) => !value)}
          onTogglePaused={() => {
            if (pausedAfterBackground) {
              resumeAfterBackground();
              setHeld(false);
            } else setHeld((value) => !value);
          }}
          paused={held || pausedAfterBackground}
          progress={progress}
          storyIndex={storyIndex}
        />

        <ChromeButton
          className="absolute left-2 top-1/2 hidden -translate-y-1/2 sm:grid"
          label="Story anterior"
          onClick={goPrevious}
        >
          <ChevronLeft aria-hidden className="size-5" />
        </ChromeButton>
        <ChromeButton
          className="absolute right-2 top-1/2 hidden -translate-y-1/2 sm:grid"
          label="Story siguiente"
          onClick={goNext}
        >
          <ChevronRight aria-hidden className="size-5" />
        </ChromeButton>

        {isOwn ? (
          <StoryOwnerBar
            onDelete={async () => {
              const result = await confirmDelete({ entity: 'story' });
              if (result.confirmed) removeStory.mutate(story.id);
            }}
            onShowViewers={() => setShowViewers(true)}
          />
        ) : null}

        {!isOwn ? (
          <StoryReplyBar
            fullName={entry.fullName}
            onCancel={() => { setReplyOpen(false); setHeld(false); }}
            onChangeText={reply.setReplyText}
            onOpen={() => { setReplyOpen(true); setHeld(true); }}
            onSubmit={reply.submitStoryReply}
            open={replyOpen}
            pending={reply.replyToStory.isPending}
            text={reply.replyText}
          />
        ) : null}

        {showViewers ? (
          <StoryViewersPanel onClose={() => setShowViewers(false)} storyId={story.id} />
        ) : null}
      </div>
    </div>
  );
}
