'use client';

import { businessTypeLabel, kycPurposeLabels, kycQueueLabels, kycReviewCopy } from '@gymsheet/domain';
import { useQuery } from '@tanstack/react-query';
import { Store } from 'lucide-react';
import { useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import { kycQueues, type EntityType, type KycQueue } from '@/shared/api/schemas';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Segmented } from '@/shared/components/ui/segmented';
import { cn } from '@/shared/lib/cn';
import { formatDateTime } from '@/shared/lib/date';
import { businessKycAdminService } from '@/features/business/services/business-kyc-client';
import { KycReviewDetail } from './kyc-review-detail';

/**
 * The two KYC queues (oldest due first, as the backend sorts them) with the
 * selected case beside them. Refreshed every minute: claims of other
 * reviewers and new submissions show up without a reload.
 */
export function KycQueuePanel({ viewerId }: Readonly<{ viewerId: string }>) {
  const [queue, setQueue] = useState<KycQueue>('REVIEW');
  const [overdue, setOverdue] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const list = useQuery({
    queryKey: queryKeys.admin.businessKyc.queue(queue, overdue),
    queryFn: () => businessKycAdminService.queue({ queue, ...(overdue ? { overdue: true } : {}) }),
    refetchInterval: 60_000,
  });
  const items = list.data?.items ?? [];
  const selected = items.find((item) => item.submissionId === selectedId) ?? null;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <Segmented
          label="Cola"
          onChange={(next) => {
            setQueue(next);
            setSelectedId(null);
          }}
          options={kycQueues.map((value) => ({ value, label: kycQueueLabels[value] }))}
          value={queue}
        />
        <Checkbox checked={overdue} label={kycReviewCopy.overdueOnly} onChange={(event) => setOverdue(event.target.checked)} />
      </div>
      {list.isPending ? (
        <div className="h-96 animate-pulse rounded-[8px] bg-[var(--surface-low)] motion-reduce:animate-none" />
      ) : list.isError ? (
        <ErrorPanel error={list.error} message={list.error.message} onRetry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState description={kycReviewCopy.emptyBody} icon={<Store className="size-6" />} title={kycReviewCopy.emptyTitle} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <Card>
            <CardContent className="max-h-[72vh] overflow-y-auto p-0">
              <ul aria-label={kycQueueLabels[queue]}>
                {items.map((item) => (
                  <li className="border-b border-[var(--border-subtle)] last:border-b-0" key={item.submissionId}>
                    <button
                      aria-current={item.submissionId === selectedId ? 'true' : undefined}
                      className={cn(
                        'grid w-full gap-1 p-4 text-left transition-colors duration-[var(--dur-2)] focus-visible:outline-offset-[-2px]',
                        item.submissionId === selectedId ? 'bg-[var(--surface-low)]' : 'hover:bg-[var(--surface-low)]',
                      )}
                      onClick={() => setSelectedId(item.submissionId)}
                      type="button"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="t-headline truncate">{item.tradeName ?? 'Sin nombre'}</span>
                        {item.overdue ? <Badge tone="danger">{kycReviewCopy.overdue}</Badge> : null}
                      </span>
                      <span className="t-footnote truncate text-[var(--text-muted)]">
                        {item.handle ? `@${item.handle} · ` : ''}
                        {businessTypeLabel(item.entityType as EntityType)} · {kycPurposeLabels[item.purpose] ?? item.purpose}
                      </span>
                      <span className="t-footnote text-[var(--text-muted)]">{kycReviewCopy.dueAt(formatDateTime(item.dueAt))}</span>
                      {item.claimedByUserId ? (
                        <span className="t-footnote text-[var(--text-muted)]">
                          {item.claimedByUserId === viewerId ? kycReviewCopy.claimedByYou : kycReviewCopy.claimedByOther}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              {selected ? (
                <KycReviewDetail key={selected.submissionId} onDone={() => setSelectedId(null)} submissionId={selected.submissionId} viewerId={viewerId} />
              ) : (
                <EmptyState description={kycReviewCopy.pickOne} flat title="Ninguna solicitud seleccionada" />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
