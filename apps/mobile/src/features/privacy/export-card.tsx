import { ActivityIndicator, View } from 'react-native';
import { ErrorState, Skeleton } from '@/components/feedback';
import { Card } from '@/components/layout';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { exportCopy } from './export-logic';
import { useAccountExport } from './use-account-export';

/** «Descargar mis datos»: one card whose sentence and action follow the job. */
export function ExportCard() {
  const flow = useAccountExport();
  if (flow.loading) return <Skeleton height={140} />;
  if (flow.error) return <ErrorState error={flow.error} onRetry={flow.retry} />;

  const copy = exportCopy(flow.view);
  const waiting = flow.view.kind === 'pending';
  return (
    <Card>
      <View accessibilityLiveRegion="polite" style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {waiting ? <ActivityIndicator color={colors.textSecondary} /> : null}
          <Text variant="headline">{copy.title}</Text>
        </View>
        <Text tone="secondary" variant="footnote">{copy.message}</Text>
      </View>
      {copy.action ? (
        <Button
          icon={flow.view.kind === 'ready' ? 'share-outline' : 'download-outline'}
          label={copy.action}
          loading={flow.busy}
          onPress={flow.act}
          size="sm"
          variant={flow.view.kind === 'ready' ? 'primary' : 'secondary'}
        />
      ) : null}
    </Card>
  );
}
