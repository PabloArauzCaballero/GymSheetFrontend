import { Redirect, useLocalSearchParams } from 'expo-router';
import { env } from '@/config/env';
import { OrderScreen } from '@/features/routine-wizard/order-screen';
import { parseDayTarget } from '@/lib/wizard-routes';

/** «Ver y ordenar» los ejercicios de un día. */
export default function OrderRoute() {
  const { dia } = useLocalSearchParams<{ dia: string }>();
  const target = parseDayTarget(dia);
  if (!env.routinesV2 || !target) return <Redirect href="/routines/new" />;
  return <OrderScreen dia={target} />;
}
