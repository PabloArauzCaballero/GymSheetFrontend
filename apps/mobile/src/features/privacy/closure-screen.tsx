import { accountClosureCopy, businessClosureCopy } from '@gymsheet/domain';
import { ErrorState, RowsSkeleton } from '@/components/feedback';
import { Card, ScrollScreen, ScreenHeader } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { Text } from '@/components/text';
import { BusinessClosureEffects, ClosureBlockers } from './closure-blockers';
import { ClosurePreviewList } from './closure-preview-list';
import { ClosureProof } from './closure-proof';
import { useAccountClosure } from './use-account-closure';

/** `business` (ADR-0028): the business shell's closure, with its effects and blockers. */
export function ClosureScreen({ business = false }: { business?: boolean }) {
  const flow = useAccountClosure(business);
  const { preview } = flow;

  return (
    <ScrollScreen>
      <BackLink fallbackHref={business ? '/(business)/cuenta' : '/datos-privacidad'} />
      <ScreenHeader
        detail
        subtitle={business ? businessClosureCopy.subtitle : 'Antes de cerrarla, mira qué pasa con cada cosa.'}
        title={business ? businessClosureCopy.title : accountClosureCopy.title}
      />

      {preview.isPending ? (
        <RowsSkeleton rows={4} thumb={24} />
      ) : preview.isError ? (
        <ErrorState error={preview.error} onRetry={() => void preview.refetch()} />
      ) : !preview.data.allowed ? (
        <Card>
          <Text variant="headline">No puedes cerrarla desde la app</Text>
          <Text tone="secondary">{accountClosureCopy.notAllowed}</Text>
        </Card>
      ) : (
        <>
          <ClosureBlockers notices={flow.blockers} />
          {business ? <BusinessClosureEffects /> : null}
          <ClosurePreviewList preview={preview.data} />
          {flow.blockers.length > 0 ? null : <ClosureProof business={business} flow={flow} />}
        </>
      )}
    </ScrollScreen>
  );
}
