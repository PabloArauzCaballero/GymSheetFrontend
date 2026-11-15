'use client';

import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { mediaProxyUrl } from '@/shared/components/media/domain-image';

const SIZE = 132;
const STROKE = 5;
const GAP = 6;
const AVATAR = SIZE - 2 * (STROKE + GAP);
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * La cara con el aro de completitud (`features/profile-hero/completion-avatar`
 * del móvil). El aro arranca vacío y se llena una vez al llegar el dato; con
 * `prefers-reduced-motion` aparece ya lleno (`motion-reduce:transition-none`).
 * Sin dato (`percent === null`) el aro queda en pista: no se pinta un 0 % falso.
 * Si la lectura falló (`onRetry`), la cara entera es un botón «Reintentar».
 */
export function CompletionAvatar({
  photoUrl,
  initials,
  percent,
  onRetry,
  retrying = false,
}: Readonly<{
  photoUrl: string | null;
  initials: string;
  percent: number | null;
  /** Set only when the completion read failed: the ring becomes a retry button. */
  onRetry?: () => void;
  retrying?: boolean;
}>) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(percent ?? 0));
    return () => cancelAnimationFrame(frame);
  }, [percent]);
  const complete = percent === 100;
  // A photo that fails to load (expired link, offline) falls back to the initials, never a broken image.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const shownUrl = photoUrl && photoUrl !== failedUrl ? photoUrl : null;
  const failed = Boolean(onRetry) && percent === null;

  const body = (
    <>
      <svg aria-hidden className="absolute top-0 left-0" height={SIZE} width={SIZE}>
        <circle cx={SIZE / 2} cy={SIZE / 2} fill="none" r={RADIUS} stroke="var(--surface-highest)" strokeWidth={STROKE} />
        <circle
          className="transition-[stroke-dashoffset] duration-[var(--dur-5)] ease-[var(--ease-out)] motion-reduce:transition-none"
          cx={SIZE / 2}
          cy={SIZE / 2}
          fill="none"
          r={RADIUS}
          stroke="var(--volt)"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - Math.min(Math.max(shown / 100, 0), 1))}
          strokeLinecap="round"
          strokeWidth={STROKE}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>
      <span className="absolute" style={{ top: STROKE + GAP, left: STROKE + GAP }}>
        {shownUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- foto de usuario por el proxy de medios
          <img alt="" className="rounded-full bg-[var(--surface-high)] object-cover" height={AVATAR} onError={() => setFailedUrl(shownUrl)} src={mediaProxyUrl(shownUrl)} style={{ width: AVATAR, height: AVATAR }} width={AVATAR} />
        ) : (
          <span className="display-title grid place-items-center rounded-full bg-[var(--surface-highest)]" style={{ width: AVATAR, height: AVATAR }}>
            {initials}
          </span>
        )}
      </span>
      {percent !== null || failed ? (
        // Volt lives in the ring only: «Completo» and «Reintentar» read in accent ink, not a second fill.
        <span
          className={`t-footnote absolute bottom-0 inline-flex items-center gap-1 rounded-full border-2 border-[var(--surface)] bg-[var(--surface-highest)] px-3 py-0.5 font-semibold ${
            complete || failed ? 'text-[var(--accent-ink)]' : ''
          }`}
        >
          {failed ? <RefreshCw aria-hidden className={`size-3.5 ${retrying ? 'animate-spin motion-reduce:animate-none' : ''}`} /> : null}
          {failed ? (retrying ? 'Reintentando…' : 'Reintentar') : complete ? 'Completo' : `${percent} %`}
        </span>
      ) : null}
    </>
  );
  const box = { width: SIZE, height: SIZE + 12 };

  if (failed && onRetry) {
    return (
      <button
        aria-busy={retrying || undefined}
        aria-label={retrying ? 'No se pudo cargar tu progreso. Reintentando' : 'No se pudo cargar tu progreso del perfil. Reintentar'}
        className="tap relative mx-auto grid cursor-pointer place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--volt)] disabled:cursor-progress"
        data-testid="profile-completion-retry-ring"
        disabled={retrying}
        onClick={onRetry}
        style={box}
        type="button"
      >
        {body}
      </button>
    );
  }
  return (
    <figure aria-label={percent === null ? 'Tu foto de perfil' : `Tu foto de perfil. Perfil completo al ${percent} %`} className="relative mx-auto grid place-items-center" role="img" style={box}>
      {body}
    </figure>
  );
}
