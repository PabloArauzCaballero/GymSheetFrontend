'use client';

import { authDestination, identitySignInCopy } from '@gymsheet/domain';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { requestGoogleNonce, signInWithGoogle } from '@/features/auth/services/auth-client';
import { googleErrorMessage } from '@/features/auth/lib/google-errors';
import { AuthAlert } from '@/features/auth/components/auth-alert';
import { publicEnv } from '@/shared/config/public-env';
import { useTheme } from '@/shared/theme/theme-provider';

type GoogleIdApi = {
  initialize: (options: Record<string, unknown>) => void;
  renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } };
  }
}

/**
 * «Continuar con Google» (Google Identity Services), only when
 * `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set. Each attempt uses a fresh nonce issued
 * by the BFF, which checks it before the ID token reaches the backend.
 */
export function GoogleSignIn({ returnTo }: Readonly<{ returnTo?: string }>) {
  const clientId = publicEnv.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) return null;
  return <GoogleButton clientId={clientId} returnTo={returnTo ?? authDestination.web.afterLogin} />;
}

function GoogleButton({ clientId, returnTo }: Readonly<{ clientId: string; returnTo: string }>) {
  const router = useRouter();
  const { theme } = useTheme();
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(() => typeof window !== 'undefined' && Boolean(window.google));
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const handleCredential = useCallback(
    async (idToken: string, nonce: string) => {
      setError(null);
      try {
        const outcome = await signInWithGoogle({ idToken, nonce });
        if (outcome.status === 'PROFILE_COMPLETION_REQUIRED') router.push('/completar-cuenta');
        else router.replace(returnTo);
        router.refresh();
      } catch (failure: unknown) {
        setError(googleErrorMessage(failure));
        // The nonce was spent: the next click needs a new one.
        setAttempt((current) => current + 1);
      }
    },
    [returnTo, router],
  );

  useEffect(() => {
    const api = window.google?.accounts.id;
    const element = container.current;
    if (!ready || !api || !element) return;
    let cancelled = false;
    void requestGoogleNonce()
      .then((nonce) => {
        if (cancelled) return;
        api.initialize({
          client_id: clientId,
          nonce,
          ux_mode: 'popup',
          callback: ({ credential }: { credential: string }) =>
            void handleCredential(credential, nonce),
        });
        api.renderButton(element, {
          type: 'standard',
          theme: theme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          locale: 'es',
          width: Math.min(400, Math.max(200, element.offsetWidth)),
        });
      })
      .catch((failure: unknown) => {
        if (!cancelled) setError(googleErrorMessage(failure));
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, clientId, handleCredential, ready, theme]);

  return (
    <div className="grid gap-4">
      <div aria-hidden className="flex items-center gap-3 text-[13px] text-[var(--text-muted)]">
        <span className="h-px flex-1 bg-[var(--border)]" />
        {identitySignInCopy.separator}
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>
      <Script
        onReady={() => setReady(true)}
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
      />
      <div
        aria-label={identitySignInCopy.google}
        className="flex min-h-11 justify-center"
        ref={container}
        role="group"
      />
      {error ? <AuthAlert message={error} /> : null}
    </div>
  );
}
