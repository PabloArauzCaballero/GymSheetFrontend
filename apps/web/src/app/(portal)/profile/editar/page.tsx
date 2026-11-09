import type { Metadata } from 'next';
import { ProfileEditClient } from '@/features/profile/components/profile-edit-client';

export const metadata: Metadata = { title: 'Editar perfil' };

export default function ProfileEditPage() {
  return <ProfileEditClient />;
}
