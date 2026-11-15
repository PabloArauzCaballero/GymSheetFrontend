import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProfileEditClient } from '@/features/profile/components/profile-edit-client';

export const metadata: Metadata = { title: 'Editar perfil' };

export default function ProfileEditPage() {
  // `useSearchParams` (pestaña «Vista previa») needs a Suspense boundary.
  return (
    <Suspense>
      <ProfileEditClient />
    </Suspense>
  );
}
