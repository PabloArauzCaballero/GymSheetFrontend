'use client';

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
 */
export function CompletionAvatar({
  photoUrl,
  initials,
  percent,
}: Readonly<{ photoUrl: string | null; initials: string; percent: number | null }>) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(percent ?? 0));
    return () => cancelAnimationFrame(frame);
  }, [percent]);
  const complete = percent === 100;

  return (
    <figure
      aria-label={percent === null ? 'Tu foto de perfil' : `Tu foto de perfil. Perfil completo al ${percent} %`}
      className="relative mx-auto grid place-items-center"
      role="img"
      style={{ width: SIZE, height: SIZE + 12 }}
    >
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
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- foto de usuario por el proxy de medios
          <img alt="" className="rounded-full bg-[var(--surface-high)] object-cover" height={AVATAR} src={mediaProxyUrl(photoUrl)} style={{ width: AVATAR, height: AVATAR }} width={AVATAR} />
        ) : (
          <span className="display-title grid place-items-center rounded-full bg-[var(--surface-highest)]" style={{ width: AVATAR, height: AVATAR }}>
            {initials}
          </span>
        )}
      </span>
      {percent !== null ? (
        <span
          className={`t-footnote absolute bottom-0 rounded-full border-2 border-[var(--surface)] px-3 py-0.5 font-semibold ${
            complete ? 'bg-[var(--volt)] text-[var(--accent-contrast)]' : 'bg-[var(--surface-highest)]'
          }`}
        >
          {complete ? 'Completo' : `${percent} %`}
        </span>
      ) : null}
    </figure>
  );
}
