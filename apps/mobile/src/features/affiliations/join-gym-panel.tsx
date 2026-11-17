import { affiliationChip, affiliationCopy, liveAffiliationsWith } from '@gymsheet/domain';
import { personAffiliationKeys, queryKeys } from '@gymsheet/hooks';
import type { Affiliation, AffiliationKind, PublicLocation } from '@gymsheet/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Skeleton } from '@/components/feedback';
import { Badge } from '@/components/layout';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { confirm, notify } from '@/notifications';
import { spacing } from '@/theme';
import { affiliationErrorText, personAffiliationsService } from './affiliations-service';
import { JoinGymSheet, type JoinGymTarget } from './join-gym-sheet';

function LiveRow({ affiliation, onCancel, busy }: { affiliation: Affiliation; onCancel: () => void; busy: boolean }) {
  const router = useRouter();
  const chip = affiliationChip(affiliation);
  const socio = affiliation.kind === 'SOCIO';
  const label = affiliation.status === 'REQUESTED' ? affiliationCopy.sent : socio ? affiliationCopy.member : affiliationCopy.coach;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }} testID={`affiliation-${affiliation.kind}`}>
      <Badge label={label} tone={chip.tone} />
      {affiliation.location ? <Text tone="secondary" variant="subhead">{affiliation.location.name}</Text> : null}
      {affiliation.status === 'REQUESTED' ? (
        <Button label={affiliationCopy.cancel} loading={busy} onPress={onCancel} size="sm" variant="ghost" />
      ) : socio ? (
        <Button label="Ver mi gimnasio" onPress={() => router.push('/mi-gimnasio')} size="sm" variant="ghost" />
      ) : null}
    </View>
  );
}

/**
 * «Hacerme socio» and «Soy entrenador aquí» on a GYM's `@handle` (franja 7b):
 * the live affiliations with this gym, or the two ways to ask.
 */
export function JoinGymPanel({ gym, locations }: { gym: JoinGymTarget; locations: PublicLocation[] }) {
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
  if (mine.isPending) return <Skeleton height={44} />;
  const live = liveAffiliationsWith(mine.data?.items ?? [], gym.entityId);
  const socio = live.find((row) => row.kind === 'SOCIO');
  const coach = live.find((row) => row.kind === 'ENTRENADOR');
  return (
    <View style={{ gap: spacing.sm }}>
      {socio ? <LiveRow affiliation={socio} busy={cancel.isPending} onCancel={() => void askCancel(socio.id)} /> : null}
      {coach ? <LiveRow affiliation={coach} busy={cancel.isPending} onCancel={() => void askCancel(coach.id)} /> : null}
      {!socio ? <Button label={affiliationCopy.join} onPress={() => setKind('SOCIO')} testID="join-gym" /> : null}
      {!coach ? <Button label={affiliationCopy.joinCoach} onPress={() => setKind('ENTRENADOR')} variant="ghost" /> : null}
      {kind ? <JoinGymSheet gym={gym} key={kind} kind={kind} locations={locations} onClose={() => setKind(null)} /> : null}
    </View>
  );
}
