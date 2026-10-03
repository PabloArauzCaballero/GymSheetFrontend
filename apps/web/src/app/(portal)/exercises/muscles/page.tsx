import type { Metadata } from 'next';
import { MuscleList } from '@/features/anatomy/components/muscle-list';

export const metadata: Metadata = { title: 'Músculos' };

export default function MusclesPage() {
  return <MuscleList />;
}
