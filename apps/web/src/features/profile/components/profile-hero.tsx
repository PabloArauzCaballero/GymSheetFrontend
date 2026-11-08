'use client';

import { Trophy } from 'lucide-react';
import type { ReactNode } from 'react';
import { HeroSurface } from '@/shared/components/mobile/hero-surface';
import { mediaProxyUrl } from '@/shared/components/media/domain-image';

/**
 * La superficie de identidad del perfil (`features/profile-hero` del móvil):
 * avatar de 88 con aro de 2 en la tinta del acento, nombre `title`, el rango
 * como chip con trofeo y, debajo, lo que la pantalla quiera enseñar.
 */
export function HeroAvatar({ photoUrl, initials }: Readonly<{ photoUrl: string | null; initials: string }>) {
  return (
    <span aria-hidden className="shrink-0 rounded-full border-2 border-[var(--accent-ink)] p-[3px]">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- foto de usuario por el proxy de medios
        <img
          alt=""
          className="size-22 rounded-full bg-[var(--surface-high)] object-cover"
          height={88}
          src={mediaProxyUrl(photoUrl)}
          width={88}
        />
      ) : (
        <span className="display-title grid size-22 place-items-center rounded-full bg-[var(--surface-highest)]">
          {initials}
        </span>
      )}
    </span>
  );
}

export function RankChip({ label }: Readonly<{ label: string }>) {
  return (
    <span
      aria-label={`Rango ${label}`}
      className="t-subhead inline-flex w-fit items-center gap-1 rounded-full bg-[var(--surface-highest)] px-3 py-1 font-semibold"
    >
      <Trophy aria-hidden className="size-4 text-[var(--accent-ink)]" />
      {label}
    </span>
  );
}

export type HeroStatItem = { key: string; value: number; label: string };

/** La primera cifra es la protagonista (`hero`); el resto, `numeric`. */
export function HeroStats({ stats }: Readonly<{ stats: readonly HeroStatItem[] }>) {
  const [lead, ...rest] = stats;
  if (!lead) return null;
  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
      <div>
        <p className="t-hero">{lead.value.toLocaleString('es-ES')}</p>
        <p className="t-footnote text-[var(--text-muted)]">{lead.label}</p>
      </div>
      {rest.map((stat) => (
        <div className="pb-0.5" key={stat.key}>
          <p className="t-numeric">{stat.value.toLocaleString('es-ES')}</p>
          <p className="t-footnote text-[var(--text-muted)]">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

export function ProfileHero({
  name,
  photoUrl,
  initials,
  rank,
  meta,
  children,
}: Readonly<{
  name: string;
  photoUrl: string | null;
  initials: string;
  rank: string | null;
  meta?: ReactNode;
  children?: ReactNode;
}>) {
  return (
    <HeroSurface watermark>
      <div className="flex items-center gap-4">
        <HeroAvatar initials={initials} photoUrl={photoUrl} />
        <div className="grid min-w-0 flex-1 gap-2">
          <h2 className="title-text line-clamp-2">{name}</h2>
          {rank ? <RankChip label={rank} /> : null}
          {meta}
        </div>
      </div>
      {children}
    </HeroSurface>
  );
}

/** Concuerda la etiqueta con la cifra: «1 sesión», «3 sesiones». */
export function plural(value: number, one: string, many: string): string {
  return value === 1 ? one : many;
}
