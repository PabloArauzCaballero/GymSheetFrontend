'use client';

import { useEffect, useState } from 'react';
import { fetchBlobFromApi } from '@/shared/api/api-client';
import { cn } from '@/shared/lib/cn';

type Loaded = { path: string; url: string } | { path: string; error: true };

/**
 * A private image (a payment QR, a receipt): fetched with the session cookie
 * through the BFF (`no-store`) into an object URL that is revoked when the
 * path changes or the view closes. It never has an address that works
 * without the viewer's session.
 */
export function usePrivateImage(path: string | null): { url: string | null; failed: boolean; retry: () => void } {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!path) return undefined;
    const controller = new AbortController();
    let url: string | null = null;
    fetchBlobFromApi(path, controller.signal)
      .then((blob) => {
        url = URL.createObjectURL(blob);
        setLoaded({ path, url });
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoaded({ path, error: true });
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [path, attempt]);

  const current = loaded && loaded.path === path ? loaded : null;
  return {
    url: current && 'url' in current ? current.url : null,
    failed: Boolean(current && 'error' in current),
    retry: () => {
      setLoaded(null);
      setAttempt((value) => value + 1);
    },
  };
}

export function PrivateImage({
  path,
  alt,
  className,
  failedText = 'No se pudo cargar la imagen.',
}: Readonly<{ path: string | null; alt: string; className?: string; failedText?: string }>) {
  const image = usePrivateImage(path);
  if (!path) return null;
  if (image.failed) {
    return (
      <div className={cn('grid place-items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--surface)] p-6 text-center', className)} role="alert">
        <p className="t-subhead text-[var(--text-muted)]">{failedText}</p>
        <button className="t-subhead min-h-11 font-semibold underline underline-offset-4" onClick={image.retry} type="button">
          Reintentar
        </button>
      </div>
    );
  }
  if (!image.url) return <div aria-busy aria-label={alt} className={cn('animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface)] motion-reduce:animate-none', className)} role="img" />;
  // eslint-disable-next-line @next/next/no-img-element -- object URL of an authenticated, no-store fetch; never a remote address.
  return <img alt={alt} className={cn('rounded-[var(--radius-lg)] object-contain', className)} src={image.url} />;
}
