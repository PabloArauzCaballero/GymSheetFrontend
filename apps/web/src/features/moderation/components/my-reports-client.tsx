'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowLeft, Flag, Undo2 } from 'lucide-react';
import Link from 'next/link';
import {
  formatDate,
  myReportStatusLabel,
  myReportTitle,
  reportCopy,
  reportKindLabel,
  withdrawConfirmMessage,
} from '@gymsheet/domain';
import type { MyReport } from '@gymsheet/schemas';
import { useWithdrawReport } from '@/features/moderation/hooks/use-withdraw-report';
import { myReportsKey, myReportsService } from '@/features/moderation/services/my-reports-service';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonList } from '@/shared/components/feedback/skeleton';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { confirm } from '@/shared/notifications';

function ReportRow({
  report,
  pending,
  onWithdraw,
}: Readonly<{ report: MyReport; pending: boolean; onWithdraw: () => void }>) {
  const title = myReportTitle(report);
  return (
    <Card className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 p-4" data-testid="my-report">
      <div className="grid min-w-0 flex-1 basis-56 gap-1">
        <p className="t-headline break-words">{title}</p>
        <p className="t-subhead text-[var(--text-muted)]">
          {reportKindLabel(report.targetKind)} · {formatDate(report.createdAt)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={report.status === 'REVISADA' ? 'success' : 'neutral'}>{myReportStatusLabel(report.status)}</Badge>
        <Button aria-label={`Retirar denuncia: ${title}`} loading={pending} onClick={onWithdraw} variant="secondary">
          <Undo2 aria-hidden className="size-4" /> Retirar denuncia
        </Button>
      </div>
    </Card>
  );
}

/**
 * «Tus denuncias»: lo que denunciaste y sigue vigente. Retirar pide
 * confirmación porque cambia lo que ves (vuelve a aparecerte) y, si seguía
 * abierta, deja de revisarse.
 */
export function MyReportsClient() {
  const reports = useInfiniteQuery({
    queryKey: myReportsKey,
    queryFn: ({ pageParam }) => myReportsService.list(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const withdraw = useWithdrawReport();
  const items = reports.data?.pages.flatMap((page) => page.items) ?? [];

  const ask = async (report: MyReport) => {
    const result = await confirm({
      title: reportCopy.confirmTitle,
      message: withdrawConfirmMessage(report),
      confirmLabel: reportCopy.confirmLabel,
      cancelLabel: reportCopy.cancelLabel,
    });
    if (result.confirmed) withdraw.mutate(report.id);
  };

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <Link
        className="tap inline-flex min-h-11 w-fit items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
        href="/settings"
      >
        <ArrowLeft aria-hidden className="size-4" /> Ajustes
      </Link>
      <PageHeader
        description={reportCopy.pageDescription}
        title="Tus denuncias"
      />
      {reports.isPending ? (
        <SkeletonList rows={3} variant="stacked" />
      ) : reports.isError ? (
        <ErrorPanel message={reports.error.message} onRetry={() => void reports.refetch()} />
      ) : items.length ? (
        <>
          <ul className="grid gap-3">
            {items.map((report) => (
              <li key={report.id}>
                <ReportRow
                  onWithdraw={() => void ask(report)}
                  pending={withdraw.isPending && withdraw.variables === report.id}
                  report={report}
                />
              </li>
            ))}
          </ul>
          {reports.hasNextPage ? (
            <Button
              className="justify-self-center"
              loading={reports.isFetchingNextPage}
              onClick={() => void reports.fetchNextPage()}
              variant="ghost"
            >
              Ver más
            </Button>
          ) : null}
        </>
      ) : (
        <EmptyState
          description="Cuando denuncies algo, aparecerá aquí y podrás retirarlo."
          icon={<Flag aria-hidden className="size-6" />}
          title="No tienes denuncias"
        />
      )}
    </div>
  );
}
