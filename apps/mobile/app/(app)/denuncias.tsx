import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import {
  formatDate,
  myReportStatusLabel,
  myReportTitle,
  reportCopy,
  reportKindLabel,
  withdrawConfirmMessage,
} from '@gymsheet/domain';
import type { MyReport } from '@gymsheet/schemas';
import { myReportsKey, myReportsService } from '@/api/my-reports-service';
import { BackLink } from '@/components/nav';
import { Badge, Card, ScreenHeader, ScrollScreen } from '@/components/layout';
import { Button } from '@/components/ui';
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/feedback';
import { withdrawReport } from '@/features/moderation/report-sent';
import { confirm } from '@/notifications';
import { colors, fontSizes, semibold, spacing } from '@/theme';

function ReportCard({ report, pending, onWithdraw }: { report: MyReport; pending: boolean; onWithdraw: () => void }) {
  const title = myReportTitle(report);
  return (
    <Card>
      <View style={{ gap: spacing.xs }}>
        <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>{title}</Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
          {reportKindLabel(report.targetKind)} · {formatDate(report.createdAt)}
        </Text>
      </View>
      <Badge label={myReportStatusLabel(report.status)} tone={report.status === 'REVISADA' ? 'success' : 'neutral'} />
      <Button
        accessibilityLabel={`Retirar denuncia: ${title}`}
        icon="arrow-undo-outline"
        label="Retirar denuncia"
        loading={pending}
        onPress={onWithdraw}
        testID={`withdraw-${report.id}`}
        variant="ghost"
      />
    </Card>
  );
}

/**
 * «Tus denuncias», desde Ajustes: lo que denunciaste y sigue vigente. Retirar
 * pide confirmación porque cambia lo que ves (vuelve a aparecerte en Explorar y
 * en el catálogo) y, si seguía abierta, deja de revisarse.
 */
export default function MyReportsScreen() {
  const queryClient = useQueryClient();
  const reports = useInfiniteQuery({
    queryKey: myReportsKey,
    queryFn: ({ pageParam }) => myReportsService.list(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const withdraw = useMutation({ mutationFn: (reportId: string) => withdrawReport(queryClient, reportId) });
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
    <ScrollScreen>
      <BackLink />
      <ScreenHeader
        subtitle={reportCopy.pageDescription}
        title="Tus denuncias"
      />
      {reports.isPending ? <RowsSkeleton rows={3} thumb={0} /> : reports.isError ? (
        <ErrorState error={reports.error} onRetry={() => void reports.refetch()} />
      ) : items.length ? (
        <View style={{ gap: spacing.sm }}>
          {items.map((report) => (
            <ReportCard
              key={report.id}
              onWithdraw={() => void ask(report)}
              pending={withdraw.isPending && withdraw.variables === report.id}
              report={report}
            />
          ))}
          {reports.hasNextPage ? (
            <Button
              label="Ver más"
              loading={reports.isFetchingNextPage}
              onPress={() => void reports.fetchNextPage()}
              size="sm"
              variant="ghost"
            />
          ) : null}
        </View>
      ) : (
        <EmptyState
          icon="flag-outline"
          message="Cuando denuncies algo, aparecerá aquí y podrás retirarlo."
          title="No tienes denuncias"
        />
      )}
    </ScrollScreen>
  );
}
