'use client';

import { affiliationChip, initials, subscriptionCopy } from '@gymsheet/domain';
import Link from 'next/link';
import type { SubscriptionGroup } from '@/shared/api/schemas';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonList } from '@/shared/components/feedback/skeleton';
import { PageHeader } from '@/shared/components/layout/page-header';
import { DomainImage } from '@/shared/components/media/domain-image';
import { Badge } from '@/shared/components/ui/badge';
import { ButtonLink } from '@/shared/components/ui/button';
import { SubscriptionLineRow } from './subscription-line-row';
import { useMySubscriptions } from './use-my-subscriptions';

function SellerHeader({ group }: Readonly<{ group: SubscriptionGroup }>) {
  const seller = group.seller;
  const name = seller?.name ?? subscriptionCopy.legacySeller;
  const socio = group.affiliation && (group.affiliation.status === 'REQUESTED' || group.affiliation.status === 'CONFIRMED')
    ? affiliationChip({ kind: 'SOCIO', status: group.affiliation.status })
    : null;
  return (
    <header className="flex items-center gap-3 px-3 pt-3">
      <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface-high)]">
        {seller?.logoUrl ? <DomainImage alt="" className="size-full object-cover" src={seller.logoUrl} /> : <span aria-hidden className="font-semibold">{initials(name)}</span>}
      </span>
      <h2 className="t-headline min-w-0 flex-1 truncate">
        {seller?.handle ? (
          <Link className="underline-offset-4 hover:underline" href={`/@${seller.handle}`}>
            {name}
          </Link>
        ) : (
          name
        )}
      </h2>
      {socio ? <Badge tone={socio.tone}>{socio.label}</Badge> : null}
    </header>
  );
}

/** «Mis suscripciones» (plan §2.10): every plan bought, grouped by seller. Replaces «Membresía». */
export function MySubscriptions() {
  const subscriptions = useMySubscriptions();
  const groups = subscriptions.data?.items ?? [];
  return (
    <div className="mx-auto grid w-full max-w-[720px] gap-6">
      <PageHeader description="Tus planes, sus días y cuándo renovarlos." title={subscriptionCopy.mine} tutorialId="page:subscriptions" />
      {subscriptions.isPending ? (
        <SkeletonList />
      ) : subscriptions.isError ? (
        <ErrorPanel error={subscriptions.error} message={subscriptions.error.message} onRetry={() => void subscriptions.refetch()} />
      ) : groups.length === 0 ? (
        <EmptyState action={<ButtonLink href="/marketplace">Ir al marketplace</ButtonLink>} description={subscriptionCopy.emptyMine} flat title="Todavía no tienes planes" />
      ) : (
        groups.map((group) => (
          <section
            aria-label={group.seller?.name ?? subscriptionCopy.legacySeller}
            className="grid rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-2"
            data-testid="subscription-group"
            key={group.seller?.entityId ?? 'legacy'}
          >
            <SellerHeader group={group} />
            <ul className="m-0 grid list-none divide-y divide-[var(--border-subtle)] p-0">
              {group.subscriptions.map((line) => (
                <SubscriptionLineRow key={`${line.listing.id ?? line.listing.name}-${line.current?.id ?? line.pendingOrder?.id ?? ''}`} line={line} today={subscriptions.data.today} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
