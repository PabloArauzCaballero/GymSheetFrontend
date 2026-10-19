import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RoutinesCatalogPage } from '@/features/routine-catalog/components/routines-catalog-page';
import { RoutinesPageClient } from '@/features/training/components/routines-page-client';
import { publicEnv } from '@/shared/config/public-env';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Rutinas' };

export default async function RoutinesPage() {
  const session = await requireSession();
  // `routinesV2` enciende el catálogo por pestañas; apagada, la lista de siempre.
  return publicEnv.routinesV2 ? (
    <Suspense>
      <RoutinesCatalogPage />
    </Suspense>
  ) : (
    <RoutinesPageClient role={session.role} />
  );
}
