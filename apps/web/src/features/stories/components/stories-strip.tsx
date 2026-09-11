'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Skeleton, SkeletonScreen } from '@/shared/components/feedback/skeleton';
import { PersonAvatar } from '@/shared/components/media/person-avatar';
import { notify } from '@/shared/notifications';
import { storiesService, storyKeys } from '@/features/stories/services/stories-service';
import { StoryViewer } from './story-viewer';

/**
 * La tira de stories: lo primero que se ve en Comunidad.
 *
 * El anillo es el único indicador de estado que necesita: encendido si queda
 * algo sin ver, apagado si ya se vio todo. Ese es el motivo de que la tira
 * exista, y por eso no lleva más adornos.
 */
export function StoriesStrip({
  ownName,
  ownUserId,
}: Readonly<{ ownName: string; ownUserId: string }>) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [startUserId, setStartUserId] = useState<string | null>(null);

  const feed = useQuery({ queryKey: storyKeys.feed, queryFn: storiesService.feed });

  const upload = useMutation({
    mutationFn: (file: File) => storiesService.upload(file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: storyKeys.feed });
      notify.success('Story publicada. Dura 24 horas.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const entries = feed.data ?? [];
  const own = entries.find((entry) => entry.userId === ownUserId) ?? null;
  const others = entries.filter((entry) => entry.userId !== ownUserId);
  // Primero quien tiene algo sin ver: es la razón por la que se mira la tira.
  const ordered = [...others].sort((a, b) => Number(b.hasUnviewed) - Number(a.hasUnviewed));
  const viewerEntries = own ? [own, ...ordered] : ordered;

  if (feed.isLoading) {
    return (
      <SkeletonScreen className="grid-flow-col justify-start gap-4" label="Cargando stories…">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton className="size-[4.5rem] rounded-full" key={index} />
        ))}
      </SkeletonScreen>
    );
  }
  if (feed.isError) {
    return <ErrorPanel message={feed.error.message} onRetry={() => feed.refetch()} />;
  }

  return (
    <section aria-label="Stories" className="grid gap-3">
      <div className="nav-scroll flex gap-4 overflow-x-auto pb-1">
        <div className="grid w-[4.75rem] shrink-0 justify-items-center gap-1.5">
          <div className="relative">
            <StoryRing
              hasUnviewed={own?.hasUnviewed ?? false}
              muted={!own}
              onClick={() => (own ? setStartUserId(own.userId) : fileInputRef.current?.click())}
              label={own ? 'Ver tu story' : 'Subir tu primera story'}
            >
              <PersonAvatar name={ownName} photoUrl={own?.photoUrl ?? null} size="md" />
            </StoryRing>
            <button
              aria-label="Subir una story"
              className="tap absolute -bottom-0.5 -right-0.5 grid size-8 place-items-center rounded-full border-2 border-[var(--background)] bg-[var(--volt)] text-[var(--accent-contrast)] disabled:opacity-60"
              disabled={upload.isPending}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <Plus aria-hidden className="size-4" />
            </button>
          </div>
          <p className="w-full truncate text-center text-xs text-[var(--text-muted)]">
            {upload.isPending ? 'Subiendo…' : 'Tu story'}
          </p>
        </div>
        {ordered.map((entry) => (
          <div className="grid w-[4.75rem] shrink-0 justify-items-center gap-1.5" key={entry.userId}>
            <StoryRing
              hasUnviewed={entry.hasUnviewed}
              label={`Ver las stories de ${entry.fullName}`}
              onClick={() => setStartUserId(entry.userId)}
            >
              <PersonAvatar name={entry.fullName} photoUrl={entry.photoUrl} size="md" />
            </StoryRing>
            <p className="w-full truncate text-center text-xs text-[var(--text-muted)]">
              {entry.fullName}
            </p>
          </div>
        ))}
        {ordered.length === 0 ? (
          <p className="self-center text-sm text-[var(--text-muted)]">
            Cuando tus matches publiquen algo, aparecerá aquí.
          </p>
        ) : null}
      </div>
      <input
        accept="image/*,video/*"
        // Fuera del recorrido de teclado y del árbol de accesibilidad: quien
        // navega con teclado llega por los botones de arriba, que sí se
        // anuncian; un campo de archivo invisible en medio sólo confunde.
        aria-hidden
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          // El input se limpia siempre: si no, elegir el mismo archivo dos
          // veces seguidas no dispara `change` y la subida parece ignorada.
          event.target.value = '';
          if (file) upload.mutate(file);
        }}
        ref={fileInputRef}
        type="file"
      />
      {startUserId ? (
        <StoryViewer
          entries={viewerEntries}
          onClose={async () => {
            setStartUserId(null);
            // Al salir, y no durante, para que los anillos no cambien debajo
            // de la story que se está mirando.
            await queryClient.invalidateQueries({ queryKey: storyKeys.feed });
          }}
          ownUserId={ownUserId}
          startUserId={startUserId}
        />
      ) : null}
    </section>
  );
}

/**
 * El anillo. Degradado cuando queda algo sin ver, línea apagada cuando ya se
 * vio todo, y punteado cuando todavía no hay nada que ver.
 */
function StoryRing({
  children,
  hasUnviewed,
  label,
  muted = false,
  onClick,
}: Readonly<{
  children: ReactNode;
  hasUnviewed: boolean;
  label: string;
  muted?: boolean;
  onClick: () => void;
}>) {
  const ring = muted
    ? 'border border-dashed border-[var(--border)]'
    : hasUnviewed
      ? 'bg-[linear-gradient(135deg,var(--volt),var(--accent-ink))]'
      : 'border border-[var(--border)]';
  return (
    <button
      aria-label={label}
      className={`tap hover-lift grid size-[4.5rem] place-items-center rounded-full p-[2px] ${ring}`}
      onClick={onClick}
      type="button"
    >
      <span className="grid size-full place-items-center rounded-full bg-[var(--background)] p-[2px]">
        {children}
      </span>
    </button>
  );
}
