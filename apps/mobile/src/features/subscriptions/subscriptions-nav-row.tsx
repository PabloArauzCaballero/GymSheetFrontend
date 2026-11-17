import { daysLeftText, headlineSubscription, subscriptionChip, subscriptionCopy } from '@gymsheet/domain';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Badge } from '@/components/layout';
import { NavRow } from '@/components/list';
import { useMySubscriptions } from './subscriptions-service';

/** «Mis suscripciones» in Perfil (plan §4.3): the plan ending first in the subtitle. Replaces «Membresía». */
export function SubscriptionsNavRow({ leading }: { leading?: ReactNode }) {
  const router = useRouter();
  const subscriptions = useMySubscriptions();
  const headline = headlineSubscription(subscriptions.data);
  const chip = headline ? subscriptionChip(headline.line.status) : null;
  const subtitle = subscriptions.isPending
    ? 'Cargando…'
    : subscriptions.isError
      ? 'No se pudieron cargar tus planes'
      : headline
        ? [headline.line.listing.name, headline.line.current ? daysLeftText(headline.line.current) : null].filter(Boolean).join(' · ')
        : 'Membresías, pases y paquetes que compraste';
  return (
    <NavRow
      leading={leading}
      meta={chip ? <Badge label={chip.label} tone={chip.tone} /> : null}
      onPress={() => router.push('/suscripciones')}
      subtitle={subtitle}
      testID="profile-subscriptions"
      title={subscriptionCopy.mine}
    />
  );
}
