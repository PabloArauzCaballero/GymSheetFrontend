import type { Metadata } from 'next';
import { ComunidadClient } from '@/features/social/components/comunidad-client';

export const metadata: Metadata = { title: 'Comunidad' };

/** Comunidad es la baraja, como la pestaña del móvil. */
export default function ComunidadPage() {
  return <ComunidadClient />;
}
