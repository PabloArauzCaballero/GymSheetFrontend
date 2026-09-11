'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  interactionKeys,
} from '@/features/interactions/services/interactions-service';
import { profileViewsService } from '@/features/interactions/services/profile-views-service';
import { MemberProfileDialog } from '@/features/social/components/member-profile-dialog';
import { Button } from '@/shared/components/ui/button';
import { ListSurface } from './list-surface';
import { PersonCard } from './person-card';

const PAGE_SIZE = 20;

/**
 * Quién vio mi perfil.
 *
 * Paginada por cursor porque la lista crece por delante: con páginas numeradas,
 * una visita nueva mientras se pagina desplaza todo y repite filas ya leídas.
 *
 * Al abrirla se marca como revisada una sola vez. Se invalidan los contadores
 * —el punto de la navegación tiene que apagarse— pero **no** la lista: si se
 * recargara, las marcas de «nuevo» desaparecerían delante del usuario, justo
 * lo que había venido a ver.
 */
export function ProfileViewsPanel() {
  const queryClient = useQueryClient();
  const checkedRef = useRef(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const summary = useQuery({
    queryKey: interactionKeys.profileViewsSummary,
    queryFn: () => profileViewsService.summary(),
  });

  const views = useInfiniteQuery({
    queryKey: interactionKeys.profileViews,
    queryFn: ({ pageParam }) => profileViewsService.list({ limit: PAGE_SIZE, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const markChecked = useMutation({
    mutationFn: () => profileViewsService.markChecked(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: interactionKeys.counts }),
    // Si falla, el punto seguirá encendido y se reintentará en la próxima
    // visita: no es un error que merezca interrumpir la lectura.
    onError: () => undefined,
  });

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    markChecked.mutate();
  }, [markChecked]);

  const viewers = views.data?.pages.flatMap((page) => page.viewers) ?? [];

  return (
    <div className="grid gap-5">
      <dl className="flex flex-wrap gap-x-10 gap-y-3">
        <SummaryStat label="Hoy" value={summary.data?.uniqueViewersToday} />
        <SummaryStat label="En total" value={summary.data?.totalUnique} />
      </dl>
      <ListSurface
        empty={viewers.length === 0}
        emptyDescription="Cuando alguien abra tu perfil desde el descubrimiento o desde el chat, lo verás aquí."
        emptyTitle="Nadie vio tu perfil todavía"
        errorMessage={views.isError ? views.error.message : null}
        loading={views.isLoading}
        onRetry={() => views.refetch()}
      >
        {viewers.map((viewer) => (
          <PersonCard
            entry={viewer}
            highlight={viewer.isNew}
            key={viewer.userId}
            meta={viewer.viewCount > 1 ? `· ${viewer.viewCount} visitas` : undefined}
            onSelect={() => setProfileUserId(viewer.userId)}
            timestamp={viewer.lastViewedAt}
          />
        ))}
      </ListSurface>
      {views.hasNextPage ? (
        <Button
          className="justify-self-center"
          loading={views.isFetchingNextPage}
          onClick={() => views.fetchNextPage()}
          variant="secondary"
        >
          Ver más
        </Button>
      ) : null}
      <MemberProfileDialog onClose={() => setProfileUserId(null)} userId={profileUserId} />
    </div>
  );
}

function SummaryStat({ label, value }: Readonly<{ label: string; value: number | undefined }>) {
  return (
    <div className="grid gap-1">
      <dt className="data-label text-[var(--text-muted)]">{label}</dt>
      <dd className="text-2xl font-semibold tracking-[-0.02em]">{value ?? '—'}</dd>
    </div>
  );
}
