'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/**
 * Cloudflare Turnstile, only when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set.
 * The token is short-lived and single-use: remount (change `key`) to get a new one.
 */
export function TurnstileWidget({
  siteKey,
  onToken,
}: Readonly<{ siteKey: string; onToken: (token: string | null) => void }>) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(
    () => typeof window !== 'undefined' && Boolean(window.turnstile),
  );
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    const api = window.turnstile;
    if (!ready || !api || !container.current) return;
    const widgetId = api.render(container.current, {
      sitekey: siteKey,
      theme: 'auto',
      language: 'es',
      callback: (token: string) => onTokenRef.current(token),
      'expired-callback': () => onTokenRef.current(null),
      'error-callback': () => onTokenRef.current(null),
    });
    return () => api.remove(widgetId);
  }, [ready, siteKey]);

  return (
    <>
      <Script
        onReady={() => setReady(true)}
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
      />
      <div className="min-h-[65px]" ref={container} />
    </>
  );
}
