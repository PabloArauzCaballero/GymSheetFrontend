'use client';

import {
  REPP_INK,
  REPP_JADE,
  REPP_MARK_BODY,
  REPP_MARK_TICK,
  REPP_MARK_VIEWBOX,
  REPP_NAVY,
  gymsheetTenant,
} from '@gymsheet/design-tokens';
import { cn } from '@/shared/lib/cn';
import { useBrand } from '@/shared/theme/brand-provider';

/** ¿La marca activa es REPP (la de referencia) y no un gimnasio con marca propia? */
function useIsRepp(): boolean {
  return useBrand().name === gymsheetTenant.name;
}

/**
 * El isotipo REPP: la «R» y el gesto en diagonal. Mismo vector que el móvil
 * (`ReppMark`), servido desde `@gymsheet/design-tokens`.
 */
export function ReppMark({
  size,
  ink = 'var(--text)',
  tick = 'var(--volt)',
  className,
}: Readonly<{ size: number; ink?: string; tick?: string; className?: string }>) {
  return (
    <svg
      aria-hidden
      className={className}
      focusable="false"
      height={size}
      viewBox={REPP_MARK_VIEWBOX}
      width={size}
    >
      <path d={REPP_MARK_BODY} fill={ink} fillRule="evenodd" />
      <path d={REPP_MARK_TICK} fill={tick} />
    </svg>
  );
}

/**
 * La marca gráfica.
 *
 * - REPP: el isotipo sobre su ficha navy, como `ReppBadge` del móvil (icono,
 *   arranque y acceso). Colores fijos de la identidad, no del tema.
 * - Gimnasio con marca propia (TOP Fitness…): conserva su monograma de texto
 *   sobre el relleno de acento, igual que hace el móvil (`tenant.id`).
 */
export function BrandMark({
  size = 44,
  glow = true,
  className,
}: Readonly<{
  /** Lado del cuadrado en píxeles. El radio y la letra se derivan de él. */
  size?: number;
  /** Halo detrás del emblema. Se apaga en contextos densos (cabeceras). */
  glow?: boolean;
  className?: string;
}>) {
  const brand = useBrand();
  const repp = useIsRepp();

  return (
    <span
      className={cn('relative inline-grid shrink-0 place-items-center', className)}
      style={{ width: size, height: size }}
    >
      {glow ? (
        <span
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full blur-xl"
          style={{ background: 'var(--volt)', opacity: 0.28, transform: 'scale(1.35)' }}
        />
      ) : null}
      <span
        aria-hidden
        className="grid h-full w-full place-items-center overflow-hidden"
        style={{
          borderRadius: Math.round(size * 0.26),
          background: repp
            ? REPP_NAVY
            : 'linear-gradient(135deg, color-mix(in srgb, var(--volt) 82%, white) 0%, var(--volt) 48%, var(--volt-dim) 100%)',
          boxShadow: repp ? 'inset 0 0 0 1px var(--border-subtle)' : undefined,
        }}
      >
        {repp ? (
          <ReppMark ink={REPP_INK} size={Math.round(size * 0.72)} tick={REPP_JADE} />
        ) : (
          <span
            style={{
              color: 'var(--accent-contrast)',
              fontSize: Math.round(size * (brand.monogram.length > 2 ? 0.34 : 0.44)),
              fontWeight: 800,
              letterSpacing: `${-size * 0.02}px`,
              lineHeight: 1,
            }}
          >
            {brand.monogram}
          </span>
        )}
      </span>
    </span>
  );
}

/**
 * Logotipo: signo + rótulo en la display, como `ReppLogo` del móvil
 * («REPP» en versales con +4 % de tracking). Un gimnasio con marca propia
 * conserva su emblema de monograma y su rótulo.
 */
export function BrandLockup({
  size = 40,
  className,
}: Readonly<{ size?: number; className?: string }>) {
  const brand = useBrand();
  const repp = useIsRepp();
  if (repp) {
    const fontSize = Math.max(17, Math.round(size * 0.62));
    return (
      <span
        aria-label={brand.name}
        className={cn('inline-flex items-center', className)}
        role="img"
        style={{ gap: Math.round(size * 0.28) }}
      >
        <ReppMark size={size} />
        <span
          aria-hidden
          className="font-display font-bold"
          translate="no"
          style={{ fontSize, letterSpacing: `${fontSize * 0.04}px`, lineHeight: 1.1 }}
        >
          {brand.wordmark}
        </span>
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <BrandMark glow={false} size={size} />
      <span className="font-semibold" style={{ fontSize: size * 0.42, letterSpacing: '0.14em' }}>
        {brand.wordmark}
      </span>
    </span>
  );
}
