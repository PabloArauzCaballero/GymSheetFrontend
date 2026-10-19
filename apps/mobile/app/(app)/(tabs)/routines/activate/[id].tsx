import { env } from '@/config/env';
import { Redirect } from 'expo-router';
import { ActivateScreen } from '@/features/program-activation/activate-screen';

export default function ActivateRoute() {
  return env.routinesV2 ? <ActivateScreen /> : <Redirect href="/routines" />;
}
