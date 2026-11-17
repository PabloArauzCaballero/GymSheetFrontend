'use client';

import { daysLeftText, headlineSubscription, subscriptionCopy } from '@gymsheet/domain';
import { CreditCard } from 'lucide-react';
import { RowGlyph } from '@/features/profile/components/profile-rows';
import { IconBadge } from '@/shared/components/mobile/icon-badge';
import { Divider, NavRow } from '@/shared/components/mobile/nav-row';
import { SubscriptionChip } from '../subscription-chip';
import { useMySubscriptions } from './use-my-subscriptions';

/** «Mis suscripciones» in the profile's account list (plan §4.3): the plan ending first in the subtitle. */
export function SubscriptionsNavRow() {
  const subscriptions = useMySubscriptions();
  const headline = headlineSubscription(subscriptions.data);
  const days = headline?.line.current ? daysLeftText(headline.line.current) : null;
  const subtitle = subscriptions.isPending
    ? 'Cargando…'
    : subscriptions.isError
      ? 'No se pudieron cargar tus planes'
      : headline
        ? [headline.line.listing.name, days].filter(Boolean).join(' · ')
        : 'Membresías, pases y paquetes que compraste';
  return (
    <NavRow
      href="/profile/suscripciones"
      leading={<RowGlyph icon={CreditCard} />}
      meta={headline ? <SubscriptionChip status={headline.line.status} /> : undefined}
      subtitle={subtitle}
      title={subscriptionCopy.mine}
    />
  );
}

/** Inicio: the running plan that ends first, quiet, at the bottom of the screen. Nothing without one. */
export function HomeSubscriptionRow({ divided = false }: Readonly<{ divided?: boolean }>) {
  const subscriptions = useMySubscriptions();
  const headline = headlineSubscription(subscriptions.data);
  const current = headline?.line.current;
  if (!headline || !current) return null;
  return (
    <>
      {divided ? <Divider /> : null}
      <NavRow
      href={`/profile/suscripciones/${current.id}`}
      leading={<IconBadge icon={CreditCard} size={36} tone="record" />}
      subtitle={[headline.sellerName, daysLeftText(current)].filter(Boolean).join(' · ')}
      title={headline.line.listing.name}
      />
    </>
  );
}
