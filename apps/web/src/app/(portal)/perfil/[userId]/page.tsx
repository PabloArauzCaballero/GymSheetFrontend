import type { Metadata } from 'next';
import { MemberProfileClient } from '@/features/social/components/member-profile-client';

export const metadata: Metadata = { title: 'Perfil de un socio' };

/**
 * El perfil de otro socio del gimnasio.
 *
 * `/profile` es el propio y esto es el ajeno: rutas distintas porque son cosas
 * distintas —una se edita, la otra se mira— y compartir la palabra las habría
 * enredado. El identificador lo valida el backend; aquí sólo viaja.
 */
export default async function MemberProfilePage({
  params,
}: Readonly<{ params: Promise<{ userId: string }> }>) {
  const { userId } = await params;
  return <MemberProfileClient userId={userId} />;
}
