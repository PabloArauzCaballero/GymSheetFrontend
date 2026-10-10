import { Redirect, useLocalSearchParams } from 'expo-router';
import { env } from '@/config/env';
import { DayPickScreen } from '@/features/routine-wizard/day-screen';
import { parseDayTarget } from '@/lib/wizard-routes';

/** Ejercicios de un día, a pantalla completa. */
export default function DayRoute() {
  const { dia } = useLocalSearchParams<{ dia: string }>();
  const target = parseDayTarget(dia);
  if (!env.routinesV2 || !target) return <Redirect href="/routines/new" />;
  return <DayPickScreen dia={target} />;
}
