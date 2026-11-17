import { ApiError } from '@gymsheet/api-client';
import { queryKeys } from '@gymsheet/hooks';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/feedback';
import { ScrollScreen } from '@/components/layout';
import { marketplaceService } from '@/features/business-listings/listings-service';
import { BusinessReportSheet, type BusinessReportTarget } from '@/features/marketplace/business-report-sheet';
import { CheckoutSheet } from '@/features/orders/checkout-sheet';
import { ListingDetailView } from '@/features/marketplace/listing-detail-view';

/** A public listing of the marketplace and its checkout (8d). Anything not public (held, hidden, paused…) is a 404 from the backend. */
export default function PublicListingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<BusinessReportTarget | null>(null);
  const [buying, setBuying] = useState(false);
  const listing = useQuery({ queryKey: queryKeys.marketplace.listing(id), queryFn: () => marketplaceService.listing(id), staleTime: 60_000 });

  if (listing.isPending) {
    return (
      <ScrollScreen>
        <RowsSkeleton rows={4} />
      </ScrollScreen>
    );
  }
  if (listing.isError) {
    const missing = listing.error instanceof ApiError && listing.error.status === 404;
    return (
      <ScrollScreen>
        {missing ? (
          <EmptyState icon="pricetag-outline" message="El negocio la pausó o REPP la está revisando." title="Esta publicación ya no está disponible" />
        ) : (
          <ErrorState error={listing.error} onRetry={() => void listing.refetch()} />
        )}
      </ScrollScreen>
    );
  }
  const data = listing.data;
  return (
    <ScrollScreen onRefresh={() => void listing.refetch()} refreshing={listing.isRefetching}>
      <ListingDetailView
        listing={data}
        onBuy={() => setBuying(true)}
        onReport={() => setReport({ kind: 'BUSINESS_LISTING', id: data.id, label: data.name })}
        onSeller={(handle) => router.push({ pathname: '/negocio/[handle]', params: { handle } })}
      />
      <BusinessReportSheet onClose={() => setReport(null)} target={report} />
      <CheckoutSheet listing={data} onClose={() => setBuying(false)} visible={buying} />
    </ScrollScreen>
  );
}
