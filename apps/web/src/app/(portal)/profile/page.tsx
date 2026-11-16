import { offersSelfieVerification } from '@gymsheet/domain';
import type { Metadata } from 'next';
import { ProfilePageClient } from '@/features/profile/components/profile-page-client';
import { requireSession } from '@/shared/server/session';
export const metadata: Metadata = { title: 'Perfil' };
export default async function ProfilePage() {
  // Same cached session as the portal layout: no extra round trip.
  const session = await requireSession();
  return <ProfilePageClient offerSelfieVerification={offersSelfieVerification(session)} />;
}
