import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SociosPanel } from '@/features/affiliations/components/gym/socios-panel';
import { getBusinessMe } from '@/shared/server/business-session';

export const metadata: Metadata = { title: 'Socios' };

/** «Socios» of a GYM business (franja 7b). Another business type goes home; the backend answers 403 anyway. */
export default async function BusinessSociosPage() {
  const me = await getBusinessMe();
  if (me && me.entity.entityType !== 'GYM') redirect('/negocio');
  return <SociosPanel />;
}
