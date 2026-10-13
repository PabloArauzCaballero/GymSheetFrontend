import type { Metadata } from 'next';
import { SocialMapClient } from '@/features/social-map/components/social-map-client';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Mapa de comunidad' };

export default async function SocialMapPage() {
  const session = await requireSession();
  return <SocialMapClient viewerId={session.id} />;
}
