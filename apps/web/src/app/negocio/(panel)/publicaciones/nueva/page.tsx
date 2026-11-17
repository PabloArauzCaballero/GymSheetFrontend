import type { Metadata } from 'next';
import { ListingWizard } from '@/features/business-listings/components/listing-wizard';
import { getBusinessMe } from '@/shared/server/business-session';

export const metadata: Metadata = { title: 'Nueva publicación' };

/** The four-step creation. The business type only orders the kinds; it never hides one. */
export default async function NewListingPage() {
  const me = await getBusinessMe();
  return <ListingWizard entityType={me?.entity.entityType ?? null} />;
}
