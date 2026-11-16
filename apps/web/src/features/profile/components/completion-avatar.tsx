'use client';

import { CloudOff } from 'lucide-react';
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
 * Si la lectura falló (`failed`), la píldora dice «Sin cargar»: el único
 * «Reintentar» de esa falla es el de la tarjeta de abajo, no dos botones iguales.
 */
export function CompletionAvatar({
  photoUrl,
  initials,
  percent,
  failed = false,
}: Readonly<{
  photoUrl: string | null;
  initials: string;
  percent: number | null;
  /** The completion read failed: the pill says so; the retry lives in the error card only. */
  failed?: boolean;
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
  const unloaded = failed && percent === null;

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
      {percent !== null || unloaded ? (
        // Volt lives in the ring only: «Completo» reads in accent ink, not a second fill.
        <span
          className={`t-footnote absolute bottom-0 inline-flex items-center gap-1 rounded-full border-2 border-[var(--surface)] bg-[var(--surface-highest)] px-3 py-0.5 font-semibold ${
            complete ? 'text-[var(--accent-ink)]' : ''
          }`}
        >
          {unloaded ? <CloudOff aria-hidden className="size-3.5" /> : null}
          {unloaded ? 'Sin cargar' : complete ? 'Completo' : `${percent} %`}
        </span>
      ) : null}
    </>
  );
  const box = { width: SIZE, height: SIZE + 12 };

  return (
    <figure aria-label={percent === null ? 'Tu foto de perfil' : `Tu foto de perfil. Perfil completo al ${percent} %`} className="relative mx-auto grid place-items-center" role="img" style={box}>
      {body}
    </figure>
  );
}
