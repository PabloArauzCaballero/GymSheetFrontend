import { useCallback, useState } from 'react';
import { Redirect } from 'expo-router';
import { LaunchIntro } from '@/components/launch-intro';
import { useAuthStore } from '@/state/auth-store';

/**
 * Entry gate.
 *
 * Shows the launch intro while the session is restored, then routes to the
 * right group. It used to be a bare spinner on black, which is what someone
 * saw for as long as `/auth/me` took: up to the client's 15 s timeout. The
 * restore now has its own short cap (see `HYDRATE_TIMEOUT_MS`) and the wait
 * reads as the brand finishing its entrance, not as a loading screen.
 */
export default function Index() {
  const status = useAuthStore((state) => state.status);
  const [introDone, setIntroDone] = useState(false);
  const finish = useCallback(() => setIntroDone(true), []);

  if (!introDone) {
    return <LaunchIntro onDone={finish} ready={status !== 'loading'} />;
  }

  return <Redirect href={status === 'authenticated' ? '/(app)/home' : '/(auth)/login'} />;
}
