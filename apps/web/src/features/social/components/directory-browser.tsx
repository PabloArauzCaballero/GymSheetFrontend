'use client';

import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, List, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { socialService } from '@/features/social/services/social-service';
import { directoryKeys } from '@/features/social/services/directory-keys';
import type { GymDirectoryEntry } from '@/shared/api/schemas';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Skeleton, SkeletonList } from '@/shared/components/feedback/skeleton';
import { PersonAvatar } from '@/shared/components/media/person-avatar';
import { cn } from '@/shared/lib/cn';
import { ConnectionActionButton, useConnectionActions } from './connection-actions';
import { DirectoryCardFace } from './directory-card-face';
import { levelTitle, trainingGoalLabels } from './directory-labels';
import { MemberDetailSheet } from './member-detail-sheet';
import type { DirectoryPreferences } from './search-preferences-dialog';

/** Lista para recorrer el gimnasio, tarjetas para mirar a una persona. */
type ViewMode = 'list' | 'cards';

/** Techo del directorio. El backend valida `max(50)`: pedir más devuelve 400. */
const DIRECTORY_LIMIT = 50;

/**
 * El directorio del gimnasio: quién más entrena aquí.
 *
 * Es la mitad del catálogo que la web había perdido. Desde el rediseño social
 * el portal sólo servía la baraja de Descubrir, que enseña a una persona por
 * pantalla y se consume: sirve para decidir, no para recorrer el gimnasio.
 * `/me/gym-directory` seguía existiendo en el servicio, sin un solo consumidor.
 *
 * Dos formas de mirar el mismo dato, como en el móvil: la lista manda por
 * defecto —cabe media docena de socios de golpe— y las tarjetas son el modo de
 * mirar a una persona. La preferencia vive en memoria; no es un ajuste de la
 * cuenta, es cómo se quiere mirar ahora mismo.
 */
export function DirectoryBrowser({
  preferences,
  query,
}: Readonly<{ preferences: DirectoryPreferences; query: string }>) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  /**
   * La ficha ampliada se guarda por identificador y no por objeto.
   *
   * Con una copia del registro, el botón de conexión de dentro seguía diciendo
   * «Conectar» después de haber conectado: la lista se refresca, pero la copia
   * que la hoja tenía delante no. Guardando el id, la ficha se deriva de los
   * datos vivos en cada render.
   */
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const actions = useConnectionActions();

  const filters = useMemo(
    () => ({
      objetivo: preferences.objetivo || undefined,
      sucursalId: preferences.sucursalId || undefined,
      genero: preferences.genero || undefined,
      q: query || undefined,
      limit: DIRECTORY_LIMIT,
    }),
    [preferences.objetivo, preferences.sucursalId, preferences.genero, query],
  );
  const filterKey = `${preferences.objetivo}|${preferences.sucursalId}|${preferences.genero}|${query}`;

  const directory = useQuery({
    queryKey: directoryKeys.list(filterKey),
    queryFn: () => socialService.directory(filters),
  });

  const openProfile = (entry: GymDirectoryEntry) => router.push(`/perfil/${entry.userId}`);
  const detail = directory.data?.find((entry) => entry.userId === detailUserId) ?? null;

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="data-label text-[var(--text-muted)]">Socios</h2>
        <ViewToggle mode={viewMode} onChange={setViewMode} />
      </div>

      {directory.isLoading ? (
        viewMode === 'cards' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton className="aspect-[4/5] w-full rounded-[var(--radius-xl)]" key={index} />
            ))}
          </div>
        ) : (
          <SkeletonList rows={4} variant="stacked" />
        )
      ) : directory.isError ? (
        <ErrorPanel message={directory.error.message} onRetry={() => directory.refetch()} />
      ) : directory.data?.length ? (
        viewMode === 'cards' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {directory.data.map((entry) => (
              <article
                className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-lowest)]"
                key={entry.userId}
              >
                <DirectoryCardFace
                  entry={entry}
                  onInfo={() => setDetailUserId(entry.userId)}
                  onOpen={() => openProfile(entry)}
                />
                <div className="p-4">
                  <ConnectionActionButton actions={actions} entry={entry} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <ul className="grid gap-2">
            {directory.data.map((entry) => (
              <DirectoryRow
                actions={actions}
                entry={entry}
                key={entry.userId}
                onOpen={() => openProfile(entry)}
              />
            ))}
          </ul>
        )
      ) : (
        <EmptyState
          description="Ajusta las preferencias de búsqueda, prueba con otro nombre o vuelve más tarde."
          title="Sin resultados"
        />
      )}

      <MemberDetailSheet
        entry={detail}
        footer={detail ? <ConnectionActionButton actions={actions} entry={detail} /> : undefined}
        onClose={() => setDetailUserId(null)}
      />
    </section>
  );
}

/**
 * Una fila del directorio.
 *
 * El nombre es el control que abre el perfil, no la fila entera: dentro vive el
 * botón de conexión, y anidar un botón en otro es HTML inválido además de una
 * trampa para el teclado.
 */
function DirectoryRow({
  actions,
  entry,
  onOpen,
}: Readonly<{
  actions: ReturnType<typeof useConnectionActions>;
  entry: GymDirectoryEntry;
  onOpen: () => void;
}>) {
  const objetivo = entry.objetivo ? (trainingGoalLabels[entry.objetivo] ?? entry.objetivo) : null;
  const subtitle = [objetivo, entry.branchName].filter(Boolean).join(' · ');

  return (
    <li className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-lowest)] p-4">
      <button
        aria-label={`Ver el perfil de ${entry.displayName}`}
        className="shrink-0 rounded-full"
        onClick={onOpen}
        type="button"
      >
        <PersonAvatar name={entry.displayName} photoUrl={entry.photoUrl} size="md" />
      </button>
      <div className="grid min-w-0 flex-1 gap-1">
        <button
          className="truncate rounded-[var(--radius-sm)] text-left font-semibold hover:underline"
          onClick={onOpen}
          type="button"
        >
          {entry.displayName}
          {entry.age !== null ? (
            <span className="ml-1.5 font-normal text-[var(--text-muted)]">{entry.age}</span>
          ) : null}
        </button>
        {subtitle ? (
          <p className="truncate text-sm text-[var(--text-muted)]">{subtitle}</p>
        ) : null}
        {entry.levelCode ? (
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-ink)]">
            <Trophy aria-hidden className="size-3.5" />
            {levelTitle(entry.levelCode)}
            {typeof entry.points === 'number'
              ? ` · ${entry.points.toLocaleString('es-ES')} pts`
              : ''}
          </p>
        ) : null}
      </div>
      <div className="shrink-0">
        <ConnectionActionButton actions={actions} entry={entry} variant="compact" />
      </div>
    </li>
  );
}

function ViewToggle({
  mode,
  onChange,
}: Readonly<{ mode: ViewMode; onChange: (mode: ViewMode) => void }>) {
  const options = [
    { value: 'list' as const, icon: List, label: 'Ver socios en lista' },
    { value: 'cards' as const, icon: LayoutGrid, label: 'Ver socios en tarjetas' },
  ];
  return (
    <div
      aria-label="Cómo ver el directorio"
      className="inline-flex gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-low)] p-1"
      role="group"
    >
      {options.map((option) => {
        const active = mode === option.value;
        const Icon = option.icon;
        return (
          <button
            aria-label={option.label}
            aria-pressed={active}
            className={cn(
              'tap grid h-9 w-11 place-items-center rounded-full transition-colors duration-[var(--dur-2)]',
              active
                ? 'bg-[var(--surface-high)] text-[var(--text)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]',
            )}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            <Icon aria-hidden className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
