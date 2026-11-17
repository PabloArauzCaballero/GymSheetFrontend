import type { Metadata } from 'next';
import { ListingsPanel } from '@/features/business-listings/components/listings-panel';

export const metadata: Metadata = { title: 'Publicaciones' };

/** «Publicaciones» of the business portal (franja 8c). The layout already requires a business session. */
export default function BusinessListingsPage() {
  return <ListingsPanel />;
}
