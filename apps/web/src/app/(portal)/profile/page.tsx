import type { Metadata } from 'next';
import { ProfilePageClient } from '@/features/profile/components/profile-page-client';
export const metadata: Metadata = { title: 'Perfil' };
export default function ProfilePage() {
  return <ProfilePageClient />;
}
