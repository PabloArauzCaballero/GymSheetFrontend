import { daysLeftText, linePeriodId, offerKindName, periodRangeText, renewListingId, sessionsText, subscriptionCopy } from '@gymsheet/domain';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { SubscriptionLine } from '@/shared/api/schemas';
import { ButtonLink } from '@/shared/components/ui/button';
import { SubscriptionChip } from '../subscription-chip';

/**
 * One plan of «Mis suscripciones»: what it is, its state, the days left (the
 * fact people come for), the open order and «Renovar» to the listing.
 */
export function SubscriptionLineRow({ line, today }: Readonly<{ line: SubscriptionLine; today: string }>) {
  const period = line.current ?? line.upcoming;
  const periodId = linePeriodId(line);
  const renewId = renewListingId(line);
  const days = line.current ? daysLeftText(line.current) : null;
  const facts = [period ? periodRangeText(period, today) : null, period ? sessionsText(period.sessions) : null].filter(Boolean).join(' · ');
  const title = (
    <span className="grid min-w-0 gap-1">
      <span className="truncate font-semibold">{line.listing.name}</span>
      <span className="t-footnote truncate text-[var(--text-muted)]">{[offerKindName(line.listing.offerKind), facts].filter(Boolean).join(' · ')}</span>
    </span>
  );
  return (
    <li className="grid gap-3 px-3 py-4" data-status={line.status} data-testid="subscription-line">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {periodId ? (
          <Link
            className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-md)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]"
            href={`/profile/suscripciones/${periodId}`}
          >
            {title}
            <ChevronRight aria-hidden className="size-5 shrink-0 text-[var(--text-muted)]" />
          </Link>
        ) : (
          <div className="min-w-0 flex-1">{title}</div>
        )}
        <span className="flex shrink-0 flex-col items-end gap-1">
          <SubscriptionChip status={line.status} />
          {days ? <span className="t-subhead font-semibold tabular-nums">{days}</span> : null}
        </span>
      </div>
      {line.upcoming && line.current ? <p className="t-footnote text-[var(--text-muted)]">{subscriptionCopy.upcoming}</p> : null}
      {line.pendingOrder || renewId ? (
        <div className="flex flex-wrap gap-2">
          {line.pendingOrder ? (
            <ButtonLink href={`/profile/compras/${line.pendingOrder.id}`} size="sm" variant="ghost">
              {subscriptionCopy.openOrder}
            </ButtonLink>
          ) : null}
          {renewId && !line.pendingOrder ? (
            <ButtonLink href={`/publicacion/${renewId}`} size="sm" variant={line.status === 'EXPIRING' || line.status === 'EXPIRED' ? 'primary' : 'ghost'}>
              {subscriptionCopy.renew}
            </ButtonLink>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
