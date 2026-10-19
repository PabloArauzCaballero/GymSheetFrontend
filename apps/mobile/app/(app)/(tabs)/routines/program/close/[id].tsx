import { env } from '@/config/env';
import { Redirect } from 'expo-router';
import { ProgramCloseScreen } from '@/features/programs/program-close-screen';

export default function ProgramCloseRoute() {
  return env.routinesV2 ? <ProgramCloseScreen /> : <Redirect href="/routines" />;
}
