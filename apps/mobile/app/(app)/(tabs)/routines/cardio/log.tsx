import { Redirect } from 'expo-router';
import { env } from '@/config/env';
import { CardioStartScreen } from '@/features/cardio/cardio-start';

export default function CardioLogRoute() {
  return env.routinesV2 ? <CardioStartScreen /> : <Redirect href="/routines" />;
}
