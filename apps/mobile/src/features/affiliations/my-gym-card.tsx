import { affiliationCopy, myGymCardOf } from '@gymsheet/domain';
import { personAffiliationKeys } from '@gymsheet/hooks';
import type { MyGym } from '@gymsheet/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { EmptyState } from '@/components/feedback';
import { Card } from '@/components/layout';
import { MediaImage } from '@/components/media-image';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { confirm, notify } from '@/notifications';
import { radii, spacing } from '@/theme';
import { affiliationErrorText, personAffiliationsService } from './affiliations-service';

/**
 * The head of «Mi gimnasio» from `GET /me/gym`: NONE explains and opens the
 * marketplace, REQUESTED is «Solicitud enviada a X», CONFIRMED shows the gym.
 */
export function MyGymCard({ myGym }: { myGym: MyGym }) {
  const router = useRouter();
  const client = useQueryClient();
  const card = myGymCardOf(myGym);
  const close = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'cancel' | 'end' }) => (action === 'cancel' ? personAffiliationsService.cancel(id) : personAffiliationsService.end(id)),
    onSuccess: (_, { action }) => {
      for (const key of personAffiliationKeys()) void client.invalidateQueries({ queryKey: key });
      notify.success(action === 'cancel' ? 'Solicitud cancelada.' : 'Ya no eres socio de ese gimnasio.');
    },
    onError: (error) => notify.error(affiliationErrorText(error)),
  });
  async function ask(id: string, action: 'cancel' | 'end', gymName: string) {
    const answer = await confirm(
      action === 'cancel'
        ? { title: '¿Cancelar la solicitud?', message: `${gymName} ya no la verá.`, confirmLabel: affiliationCopy.cancel, cancelLabel: 'Volver' }
        : { title: `¿Dejar ${gymName}?`, message: 'Dejas de ver su clasificación y a sus socios.', confirmLabel: affiliationCopy.leave, cancelLabel: 'Quedarme', severity: 'danger' },
    );
    if (answer.confirmed) close.mutate({ id, action });
  }

  if (card.state === 'NONE') {
    return (
      <EmptyState icon="business-outline" message={card.message} title={card.title}>
        <Button label={card.action} onPress={() => router.push('/directorio')} />
      </EmptyState>
    );
  }
  if (card.state === 'REQUESTED') {
    return (
      <Card>
        <Text tone="secondary" variant="footnote">{affiliationCopy.sent}</Text>
        <Text accessibilityRole="header" variant="headline">{card.title}</Text>
        <Text tone="secondary" variant="subhead">{card.message}</Text>
        <Button label={affiliationCopy.cancel} loading={close.isPending} onPress={() => void ask(card.affiliationId, 'cancel', card.gymName)} size="sm" variant="ghost" />
      </Card>
    );
  }
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <MediaImage style={{ width: 56, height: 56, borderRadius: radii.lg, borderCurve: 'continuous' }} uri={card.logoUrl} />
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text accessibilityRole="header" numberOfLines={2} variant="headline">{card.gymName}</Text>
          <Text tone="secondary" variant="subhead">{card.detail || card.title}</Text>
        </View>
      </View>
      {card.switching ? (
        <View style={{ gap: spacing.xs }}>
          <Text tone="secondary" variant="subhead">{`Pediste cambiarte a ${card.switching.gymName}. Sigues aquí hasta que te confirme.`}</Text>
          <Button label={affiliationCopy.cancel} loading={close.isPending} onPress={() => void ask(card.switching?.affiliationId ?? '', 'cancel', card.switching?.gymName ?? '')} size="sm" variant="ghost" />
        </View>
      ) : null}
      {card.handle ? <Button label="Ver el gimnasio" onPress={() => router.push({ pathname: '/negocio/[handle]', params: { handle: card.handle ?? '' } })} size="sm" variant="ghost" /> : null}
      {myGym.affiliationId ? <Button label={affiliationCopy.leave} loading={close.isPending} onPress={() => void ask(myGym.affiliationId ?? '', 'end', card.gymName)} size="sm" variant="ghost" /> : null}
    </Card>
  );
}
