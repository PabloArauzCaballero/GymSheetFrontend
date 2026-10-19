import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DayPick } from '@/features/routine-wizard/components/day-pick';
import { parseDayTarget } from '@/features/routine-wizard/paths';
import { publicEnv } from '@/shared/config/public-env';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Ejercicios del día' };

/** Ejercicios de un día del asistente (1 a 7) o del grupo «Configurar seleccionados». */
export default async function WizardDayPage({
  params,
}: Readonly<{ params: Promise<{ dia: string }> }>) {
  await requireSession();
  const dia = parseDayTarget((await params).dia);
  if (!publicEnv.routinesV2 || !dia) notFound();
  return <DayPick dia={dia} />;
}
