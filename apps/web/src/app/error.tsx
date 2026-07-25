'use client';

import { useEffect } from 'react';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';

export default function RouteError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  useEffect(() => {
    // The browser console retains the digest for support without rendering a stack trace to users.
    console.error('Unhandled route error', { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <main className="mx-auto grid min-h-dvh max-w-3xl place-items-center px-5 py-12">
      <ErrorPanel
        message="La vista encontró un error inesperado. Reintenta o vuelve a iniciar sesión si el problema continúa."
        onRetry={reset}
      />
    </main>
  );
}
