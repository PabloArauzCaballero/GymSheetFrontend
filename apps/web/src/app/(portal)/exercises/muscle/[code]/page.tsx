import { muscleInfo } from '@gymsheet/anatomy';
import type { Metadata } from 'next';
import { MusclePage } from '@/features/anatomy/components/muscle-page';

type Params = Promise<{ code: string }>;

export async function generateMetadata({ params }: Readonly<{ params: Params }>): Promise<Metadata> {
  const { code } = await params;
  return { title: muscleInfo(code.toUpperCase())?.name ?? 'Músculo' };
}

export default async function MuscleRoute({ params }: Readonly<{ params: Params }>) {
  const { code } = await params;
  return <MusclePage code={code} />;
}
