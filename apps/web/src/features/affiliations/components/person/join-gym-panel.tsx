'use client';

import { affiliationChip, affiliationCopy, liveAffiliationsWith } from '@gymsheet/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { personAffiliationKeys, queryKeys } from '@/shared/api/query-keys';
import type { Affiliation, AffiliationKind, PublicLocation } from '@/shared/api/schemas';
import { Skeleton } from '@/shared/components/feedback/skeleton';
import { Badge } from '@/shared/components/ui/badge';
import { Button, ButtonLink } from '@/shared/components/ui/button';
import { confirm, notify } from '@/shared/notifications';
import type { Viewer } from '@/features/business-listings/components/public/report-button';
import { affiliationErrorText, personAffiliationsService } from '../../services/affiliations-client';
import { JoinGymDialog, type JoinGymTarget } from './join-gym-dialog';

/** One live affiliation with this gym: its chip and what the person can do next. */
function LiveRow({ affiliation, onCancel, cancelling }: Readonly<{ affiliation: Affiliation; onCancel: () => void; cancelling: boolean }>) {
  const chip = affiliationChip(affiliation);
  const socio = affiliation.kind === 'SOCIO';
  return (
    <div className="flex flex-wrap items-center gap-3" data-testid={`affiliation-${affiliation.kind}`}>
      <Badge tone={chip.tone}>{affiliation.status === 'REQUESTED' ? affiliationCopy.sent : socio ? affiliationCopy.member : affiliationCopy.coach}</Badge>
      {affiliation.location ? <span className="t-subhead text-[var(--text-muted)]">{affiliation.location.name}</span> : null}
      {affiliation.status === 'REQUESTED' ? (
        <Button loading={cancelling} onClick={onCancel} size="sm" variant="ghost">
          {affiliationCopy.cancel}
        </Button>
      ) : socio ? (
        <ButtonLink href="/mi-gimnasio" size="sm" variant="ghost">
          Ver mi gimnasio
        </ButtonLink>
      ) : null}
    </div>
  );
}

function PersonJoin({ gym, locations }: Readonly<{ gym: JoinGymTarget; locations: PublicLocation[] }>) {
  const client = useQueryClient();
  const [kind, setKind] = useState<AffiliationKind | null>(null);
  // At most one live SOCIO and a few live ENTRENADOR rows: the newest page holds them.
  const mine = useQuery({ queryKey: queryKeys.affiliations.list, queryFn: () => personAffiliationsService.list({ limit: 50 }) });
  const cancel = useMutation({
    mutationFn: (affiliationId: string) => personAffiliationsService.cancel(affiliationId),
    onSuccess: () => {
      for (const key of personAffiliationKeys()) void client.invalidateQueries({ queryKey: key });
      notify.success('Solicitud cancelada.');
    },
    onError: (error) => notify.error(affiliationErrorText(error)),
  });
  async function askCancel(affiliationId: string) {
    const answer = await confirm({ title: '¿Cancelar la solicitud?', message: `${gym.name} ya no la verá. Podrás volver a pedirla mañana.`, confirmLabel: affiliationCopy.cancel, cancelLabel: 'Volver' });
    if (answer.confirmed) cancel.mutate(affiliationId);
  }

  if (mine.isPending) return <Skeleton className="h-11 w-48 rounded-full" />;
  const live = liveAffiliationsWith(mine.data?.items ?? [], gym.entityId);
  const socio = live.find((row) => row.kind === 'SOCIO');
  const coach = live.find((row) => row.kind === 'ENTRENADOR');
  return (
    <div className="grid gap-3">
      {socio ? <LiveRow affiliation={socio} cancelling={cancel.isPending} onCancel={() => void askCancel(socio.id)} /> : null}
      {coach ? <LiveRow affiliation={coach} cancelling={cancel.isPending} onCancel={() => void askCancel(coach.id)} /> : null}
      {!socio || !coach ? (
        <div className="flex flex-wrap gap-2">
          {!socio ? (
            <Button onClick={() => setKind('SOCIO')} size="lg" variant="primary">
              {affiliationCopy.join}
            </Button>
          ) : null}
          {!coach ? (
            <Button onClick={() => setKind('ENTRENADOR')} size="lg" variant="ghost">
              {affiliationCopy.joinCoach}
            </Button>
          ) : null}
        </div>
      ) : null}
      {kind ? <JoinGymDialog gym={gym} initialKind={kind} key={kind} locations={locations} onClose={() => setKind(null)} /> : null}
    </div>
  );
}

/**
 * «Hacerme socio» and «Soy entrenador aquí» on a GYM's `/@handle` (franja 7b):
 * a person asks, the gym confirms. A visitor is asked to sign in first; a
 * business account does not affiliate.
 */
export function JoinGymPanel({ gym, locations, viewer }: Readonly<{ gym: JoinGymTarget; locations: PublicLocation[]; viewer: Viewer }>) {
  if (viewer === 'business') return null;
  if (viewer === 'anonymous') {
    return (
      <Link
        className="t-subhead inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
        href={`/login?returnTo=${encodeURIComponent(`/@${gym.handle}`)}`}
      >
        {affiliationCopy.signIn}
      </Link>
    );
  }
  return <PersonJoin gym={gym} locations={locations} />;
}
