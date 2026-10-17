import { env } from '@/config/env';
import { Redirect } from 'expo-router';
import { ActiveRoutineScreen } from '@/features/programs/active-routine-screen';

export default function ActiveRoutineRoute() {
  return env.routinesV2 ? <ActiveRoutineScreen /> : <Redirect href="/routines" />;
}
