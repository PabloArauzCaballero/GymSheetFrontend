'use client';

import { daysLeftText, historyEntryText, offerKindName, periodRangeText, sessionsText, subscriptionCopy } from '@gymsheet/domain';
import { ApiError } from '@gymsheet/api-client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonDetail } from '@/shared/components/feedback/skeleton';
import { ButtonLink } from '@/shared/components/ui/button';
import { formatDateTime } from '@/shared/lib/date';
import { personSubscriptionsService } from '../../services/subscriptions-client';
import { SubscriptionChip } from '../subscription-chip';

const card = 'grid gap-4 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-5 sm:p-6';

/** One period of «Mis suscripciones» with its history; someone else's is a 404 from the backend. */
export function SubscriptionDetail({ periodId }: Readonly<{ periodId: string }>) {
  const detail = useQuery({ queryKey: queryKeys.subscriptions.detail(periodId), queryFn: () => personSubscriptionsService.get(periodId) });
  if (detail.isPending) return <SkeletonDetail />;
  if (detail.isError) {
    if (detail.error instanceof ApiError && detail.error.status === 404) return <EmptyState description="No es tuya o el enlace está mal." flat title="No encontramos esta suscripción" />;
    return <ErrorPanel error={detail.error} message={detail.error.message} onRetry={() => void detail.refetch()} />;
  }
  const data = detail.data;
  const days = daysLeftText(data);
  const sessions = sessionsText(data.sessions);
  const renewId = data.renew?.available ? data.renew.listingId : null;
  return (
    <div className="mx-auto grid w-full max-w-[720px] gap-6">
      <Link className="t-subhead inline-flex min-h-11 items-center justify-self-start font-semibold text-[var(--text-muted)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]" href="/profile/suscripciones">
        ← {subscriptionCopy.mine}
      </Link>
      <header className="grid gap-2">
        <SubscriptionChip status={data.status} />
        <h1 className="display-title text-balance break-words">{data.listing.name}</h1>
        <p className="t-subhead text-[var(--text-muted)]">{[offerKindName(data.listing.offerKind), data.seller?.name].filter(Boolean).join(' · ')}</p>
      </header>
      <section aria-label="Vigencia" className={card}>
        {days ? <p className="display-title tabular-nums">{days}</p> : null}
        <p className="t-headline">{periodRangeText(data)}</p>
        {sessions ? <p className="t-subhead text-[var(--text-muted)]">{sessions}</p> : null}
        {renewId ? (
          <ButtonLink className="justify-self-start" href={`/publicacion/${renewId}`} variant="primary">
            {subscriptionCopy.renew}
          </ButtonLink>
        ) : null}
      </section>
      {data.history.length > 0 ? (
        <section aria-labelledby="subscription-history" className={card}>
          <h2 className="t-headline" id="subscription-history">
            {subscriptionCopy.history}
          </h2>
          <ol className="m-0 grid list-none gap-3 p-0">
            {data.history.map((entry) => (
              <li className="grid gap-0.5" key={`${entry.at}-${entry.toStatus}`}>
                <span className="font-semibold">{historyEntryText(entry)}</span>
                <span className="t-footnote text-[var(--text-muted)]">{formatDateTime(entry.at)}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
