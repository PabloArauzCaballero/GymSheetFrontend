import { queryKeys } from '@gymsheet/hooks';
import { useQuery } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/feedback';
import { ScrollScreen } from '@/components/layout';
import { marketplaceService } from '@/features/business-listings/listings-service';
import { BusinessReportSheet, type BusinessReportTarget } from '@/features/marketplace/business-report-sheet';
import { PublicProfileView } from '@/features/marketplace/public-profile-view';
import { ApiError } from '@gymsheet/api-client';

/** `@handle` in the person app: the public business profile; a renamed handle goes to the new one. */
export default function PublicBusinessScreen() {
  const router = useRouter();
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const [report, setReport] = useState<BusinessReportTarget | null>(null);
  const profile = useQuery({ queryKey: queryKeys.marketplace.profile(handle), queryFn: () => marketplaceService.profile(handle), staleTime: 60_000 });

  if (profile.isPending) {
    return (
      <ScrollScreen>
        <RowsSkeleton rows={4} />
      </ScrollScreen>
    );
  }
  if (profile.isError) {
    const missing = profile.error instanceof ApiError && profile.error.status === 404;
    return (
      <ScrollScreen>
        {missing ? (
          <EmptyState icon="storefront-outline" message="Revisa el @usuario: puede que haya cambiado o que el negocio ya no esté en REPP." title="No encontramos ese negocio" />
        ) : (
          <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
        )}
      </ScrollScreen>
    );
  }
  if ('redirectTo' in profile.data) return <Redirect href={{ pathname: '/negocio/[handle]', params: { handle: profile.data.redirectTo } }} />;
  const data = profile.data;
  return (
    <ScrollScreen onRefresh={() => void profile.refetch()} refreshing={profile.isRefetching}>
      <PublicProfileView
        onOpen={(listing) => router.push({ pathname: '/publicacion/[id]', params: { id: listing.id } })}
        onReport={() => setReport({ kind: 'BUSINESS_PROFILE', id: data.entity.id, label: data.entity.name })}
        profile={data}
      />
      <BusinessReportSheet onClose={() => setReport(null)} target={report} />
    </ScrollScreen>
  );
}
