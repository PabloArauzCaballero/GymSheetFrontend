import { env } from '@/config/env';
import { Redirect } from 'expo-router';
import { ProgramDetailScreen } from '@/features/programs/program-detail-screen';

export default function ProgramRoute() {
  return env.routinesV2 ? <ProgramDetailScreen /> : <Redirect href="/routines" />;
}
