import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { GymLinksPanel } from '@/features/affiliations/components/coach/gym-links-panel';
import { getBusinessMe } from '@/shared/server/business-session';

export const metadata: Metadata = { title: 'Mis gimnasios' };

/** «Mis gimnasios» of a COACH business (franja 7b). Another business type goes home; the backend answers 403 anyway. */
export default async function BusinessGymLinksPage() {
  const me = await getBusinessMe();
  if (me && me.entity.entityType !== 'COACH') redirect('/negocio');
  return <GymLinksPanel />;
}
