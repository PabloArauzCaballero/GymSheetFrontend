import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DayOrder } from '@/features/routine-wizard/components/day-order';
import { parseDayTarget } from '@/features/routine-wizard/paths';
import { publicEnv } from '@/shared/config/public-env';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Ver y ordenar el día' };

export default async function WizardDayOrderPage({
  params,
}: Readonly<{ params: Promise<{ dia: string }> }>) {
  await requireSession();
  const dia = parseDayTarget((await params).dia);
  if (!publicEnv.routinesV2 || !dia) notFound();
  return <DayOrder dia={dia} />;
}
