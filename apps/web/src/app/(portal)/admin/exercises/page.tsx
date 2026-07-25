import type { Metadata } from 'next';
import { ExerciseAdmin } from '@/features/admin/components/exercise-admin';
import { requireRole } from '@/shared/server/session';
export const metadata: Metadata = { title: 'Catálogo global' };
export default async function ExerciseAdminPage() {
  await requireRole(['ADMIN']);
  return <ExerciseAdmin />;
}
