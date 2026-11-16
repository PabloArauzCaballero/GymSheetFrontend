'use client';

import { gestureGlyph, verificationGymLabel, verificationReviewCopy } from '@gymsheet/domain';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Card, CardContent } from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/cn';
import { formatDateTime } from '@/shared/lib/date';
import { verificationService } from '../services/verification-service';
import { VerificationReviewPanel } from './verification-review-panel';

/**
 * `/moderacion/verificaciones`: selfies of every gym waiting for the REPP team.
 * Refreshed every 4 minutes, inside the 5-minute life of the signed selfie
 * links, so an open item never shows a dead link for long. The backend
 * authorizes every call; this screen only hides what it cannot use.
 */
export function VerificationQueue() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queue = useQuery({
    queryKey: queryKeys.admin.verifications,
    queryFn: verificationService.queue,
    refetchInterval: 4 * 60_000,
  });
  const items = queue.data ?? [];
  const selected = items.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader description={verificationReviewCopy.description} title={verificationReviewCopy.title} />
      {queue.isPending ? (
        <div className="h-96 animate-pulse rounded-[8px] bg-[var(--surface-low)] motion-reduce:animate-none" />
      ) : queue.isError ? (
        <ErrorPanel error={queue.error} message={queue.error.message} onRetry={() => void queue.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          description={verificationReviewCopy.emptyBody}
          icon={<ShieldCheck className="size-6" />}
          title={verificationReviewCopy.emptyTitle}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <Card>
            <CardContent className="max-h-[70vh] overflow-y-auto p-0">
              <ul aria-label="Selfies por revisar">
                {items.map((item) => (
                  <li className="border-b border-[var(--border-subtle)] last:border-b-0" key={item.id}>
                    <button
                      aria-current={item.id === selectedId ? 'true' : undefined}
                      className={cn(
                        'flex w-full items-center gap-3 p-4 text-left transition-colors duration-[var(--dur-2)] focus-visible:outline-offset-[-2px]',
                        item.id === selectedId ? 'bg-[var(--surface-low)]' : 'hover:bg-[var(--surface-low)]',
                      )}
                      onClick={() => setSelectedId(item.id)}
                      type="button"
                    >
                      <span aria-hidden className="text-2xl leading-none">
                        {gestureGlyph(item.gesture)}
                      </span>
                      <span className="grid min-w-0 gap-0.5">
                        <span className="t-headline truncate">{item.member.name}</span>
                        <span className="t-footnote truncate text-[var(--text-muted)]">
                          {verificationGymLabel(item)} · {item.submittedAt ? formatDateTime(item.submittedAt) : 'Sin fecha'}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              {selected ? (
                <VerificationReviewPanel
                  item={selected}
                  key={selected.id}
                  onDone={() => setSelectedId(null)}
                  onReload={() => void queue.refetch()}
                  reloading={queue.isFetching}
                />
              ) : (
                <EmptyState description={verificationReviewCopy.pickOne} flat title="Ninguna selfie seleccionada" />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
