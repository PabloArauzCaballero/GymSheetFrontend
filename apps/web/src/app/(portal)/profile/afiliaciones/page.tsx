import type { Metadata } from 'next';
import { MyAffiliationsList } from '@/features/affiliations/components/person/my-affiliations-list';

export const metadata: Metadata = { title: 'Mis afiliaciones' };

/** «Mis afiliaciones» (franja 7b): requests and memberships with their state. */
export default function MyAffiliationsPage() {
  return <MyAffiliationsList />;
}
