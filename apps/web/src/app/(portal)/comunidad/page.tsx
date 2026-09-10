import type { Metadata } from 'next';
import { ComunidadClient } from '@/features/social/components/comunidad-client';

export const metadata: Metadata = { title: 'Comunidad' };

export default function ComunidadPage() {
  return <ComunidadClient />;
}
