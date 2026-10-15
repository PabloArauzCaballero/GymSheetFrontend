'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { socialService } from '@/features/social/services/social-service';
import { connectionKeys } from '@/features/social/services/directory-keys';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Skeleton, SkeletonScreen } from '@/shared/components/feedback/skeleton';
import { MediaSourceDialog } from '@/shared/components/media/media-source-dialog';
import { PersonAvatar } from '@/shared/components/media/person-avatar';
import { notify } from '@/shared/notifications';
import { storiesService, storyKeys } from '@/features/stories/services/stories-service';
import { canSubmitStoryAudience, type AcceptedConnectionsState } from '@/features/stories/lib/story-audience-selection';
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
  const [picking, setPicking] = useState(false);
  const [startUserId, setStartUserId] = useState<string | null>(null);
  const [audienceMode, setAudienceMode] = useState<'ALL_CONNECTIONS' | 'SELECTED_CONNECTIONS'>('ALL_CONNECTIONS');
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const uploadAttemptRef = useRef<{
    file: File;
    requestId: string;
    mode: 'ALL_CONNECTIONS' | 'SELECTED_CONNECTIONS';
    recipients: string[];
  } | null>(null);
  const [uploadFailed, setUploadFailed] = useState(false);

  const feed = useQuery({
    queryKey: storyKeys.feed,
    queryFn: storiesService.feed,
    refetchInterval: startUserId ? 5_000 : false,
    refetchIntervalInBackground: false,
  });
  const connections = useQuery({
    queryKey: connectionKeys.byStatus('ACCEPTED'),
    queryFn: () => socialService.listConnections('ACCEPTED'),
    enabled: picking,
  });
  const connectionsState: AcceptedConnectionsState = connections.isLoading || connections.isFetching
    ? 'loading'
    : connections.isError ? 'error' : 'loaded';
  const audienceReady = canSubmitStoryAudience(audienceMode, recipientIds, connectionsState);

  const upload = useMutation({
    mutationFn: ({
      file,
      requestId,
      mode,
      recipients,
    }: { file: File; requestId: string; mode: 'ALL_CONNECTIONS' | 'SELECTED_CONNECTIONS'; recipients: string[] }) =>
      storiesService.upload(file, { mode, recipientIds: recipients, requestId }),
    onSuccess: async () => {
      setUploadFailed(false);
      uploadAttemptRef.current = null;
      await queryClient.invalidateQueries({ queryKey: storyKeys.feed });
      notify.success('Story publicada. Dura 24 horas.');
    },
    onError: (error: Error) => {
      setUploadFailed(true);
      notify.error(error);
    },
  });

  function submitUpload(file: File) {
    if (upload.isPending || !audienceReady) return;
    const attempt = { file, requestId: crypto.randomUUID(), mode: audienceMode, recipients: [...recipientIds] };
    uploadAttemptRef.current = attempt;
    setUploadFailed(false);
    upload.mutate(attempt);
  }

  function retryUpload() {
    const attempt = uploadAttemptRef.current;
    if (attempt && !upload.isPending) upload.mutate(attempt);
  }

  function openComposer() {
    setAudienceMode('ALL_CONNECTIONS');
    setRecipientIds([]);
    setPicking(true);
  }

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
              onClick={() => (own ? setStartUserId(own.userId) : openComposer())}
              label={own ? 'Ver tu story' : 'Subir tu primera story'}
            >
              <PersonAvatar name={ownName} photoUrl={own?.photoUrl ?? null} size="md" />
            </StoryRing>
            <button
              aria-label="Subir una story"
              className="tap absolute -bottom-0.5 -right-0.5 grid size-8 place-items-center rounded-full border-2 border-[var(--background)] bg-[var(--volt)] text-[var(--accent-contrast)] disabled:opacity-60"
              disabled={upload.isPending}
              onClick={openComposer}
              type="button"
            >
              <Plus aria-hidden className="size-4" />
            </button>
          </div>
          <p className="w-full truncate text-center text-xs text-[var(--text-muted)]">
            {upload.isPending ? 'Subiendo…' : 'Tu story'}
          </p>
          {uploadFailed ? (
            <button className="text-xs font-semibold underline" onClick={retryUpload} type="button">
              Reintentar subida
            </button>
          ) : null}
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
      <MediaSourceDialog
        // Imagen o vídeo: los dos visores saben reproducirlos (el móvil, desde
        // que `story-viewer.tsx` monta `expo-video`), así que la web ya no
        // puede publicar nada inconsumible en el teléfono.
        accept="image/*,video/*"
        busy={
          upload.isPending ||
          !audienceReady
        }
        captureFileName="story"
        captureLabel="Publicar esta foto"
        description="Se verá durante 24 horas. Puedes elegir todas tus conexiones aceptadas o personas concretas."
        fileLabel="Elegir una imagen o un vídeo"
        onOpenChange={setPicking}
        onPick={submitUpload}
        open={picking}
        title="Añadir una story"
      >
        <fieldset className="grid gap-2 rounded-xl border border-[var(--border)] p-3">
          <legend className="px-1 text-sm font-semibold">Quién puede verla</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              checked={audienceMode === 'ALL_CONNECTIONS'}
              name="story-audience"
              onChange={() => setAudienceMode('ALL_CONNECTIONS')}
              type="radio"
            />
            Todas mis conexiones aceptadas
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              checked={audienceMode === 'SELECTED_CONNECTIONS'}
              name="story-audience"
              onChange={() => setAudienceMode('SELECTED_CONNECTIONS')}
              type="radio"
            />
            Solo personas elegidas
          </label>
          {audienceMode === 'SELECTED_CONNECTIONS' ? (
            connections.isLoading ? <p className="text-sm text-[var(--text-muted)]" role="status">Cargando conexiones…</p>
              : connections.isFetching ? <p className="text-sm text-[var(--text-muted)]" role="status">Actualizando conexiones…</p>
              : connections.isError ? (
                <div className="grid justify-items-start gap-2" role="alert">
                  <p className="text-sm text-[var(--text-muted)]">No se pudieron cargar las conexiones.</p>
                  <button className="text-sm font-semibold underline" onClick={() => void connections.refetch()} type="button">
                    Reintentar
                  </button>
                </div>
              )
                : connections.data?.length ? (
                  <div aria-label="Selecciona quién puede ver esta story" className="grid max-h-48 gap-2 overflow-y-auto">
                    {connections.data.map((connection) => (
                      <label className="flex items-center gap-2 text-sm" key={connection.otherUserId}>
                        <input
                          checked={recipientIds.includes(connection.otherUserId)}
                          onChange={(event) => setRecipientIds((current) => event.target.checked
                            ? current.includes(connection.otherUserId) ? current : [...current, connection.otherUserId]
                            : current.filter((id) => id !== connection.otherUserId))}
                          type="checkbox"
                        />
                        {connection.otherUserName}
                      </label>
                    ))}
                  </div>
                ) : <p className="text-sm text-[var(--text-muted)]">Todavía no tienes conexiones aceptadas.</p>
          ) : null}
          {audienceMode === 'SELECTED_CONNECTIONS' && recipientIds.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Elige al menos una persona para continuar.</p>
          ) : null}
        </fieldset>
      </MediaSourceDialog>
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
