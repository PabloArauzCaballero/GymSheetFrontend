'use client';

import { cn } from '@/shared/lib/cn';
import { useBrand } from '@/shared/theme/brand-provider';

/**
 * La marca gráfica: cuadrado redondeado con el monograma del gimnasio.
 *
 * Es el mismo dibujo que la cortinilla de arranque del móvil
 * (`apps/mobile/src/components/brand-intro.tsx`) — relleno en degradado del
 * acento, monograma en el color de contraste, halo tenue detrás — de modo que
 * alguien que instala la aplicación y luego entra por el navegador reconoce lo
 * mismo. Antes la web sólo tenía un `<span>` con dos letras sobre un rectángulo
 * plano, que no se parecía a nada de lo que el móvil enseña al abrirse.
 *
 * El degradado se compone con `color-mix` sobre los tokens del inquilino en vez
 * de declarar un par de colores nuevo: así un gimnasio que cambie su acento
 * arrastra el emblema consigo sin tocar el contrato de color, que tiene sus
 * propias pruebas.
 *
 * El monograma es **texto**, no una imagen: escala sin bordes dentados a
 * cualquier tamaño y hereda la tipografía de la marca.
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

  return (
    <span
      className={cn('relative inline-grid shrink-0 place-items-center', className)}
      style={{ width: size, height: size }}
    >
      {glow ? (
        <span
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full blur-xl"
          style={{
            background: 'var(--volt)',
            opacity: 0.28,
            transform: 'scale(1.35)',
          }}
        />
      ) : null}
      <span
        aria-hidden
        className="grid h-full w-full place-items-center overflow-hidden"
        style={{
          borderRadius: Math.round(size * 0.26),
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--volt) 82%, white) 0%, var(--volt) 48%, var(--volt-dim) 100%)',
        }}
      >
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
      </span>
    </span>
  );
}

/**
 * Emblema + rótulo, la forma en que la marca se presenta cuando hay sitio.
 *
 * `wordmark` va en versales anchas y en el color de texto, no en el acento: el
 * emblema ya lleva el color de la marca y repetirlo en el rótulo satura la
 * composición en lugar de rematarla — la misma decisión que toma la cortinilla
 * del móvil.
 */
export function BrandLockup({
  size = 40,
  className,
}: Readonly<{ size?: number; className?: string }>) {
  const brand = useBrand();
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <BrandMark glow={false} size={size} />
      <span
        className="font-semibold"
        style={{ fontSize: size * 0.42, letterSpacing: '0.14em' }}
      >
        {brand.wordmark}
      </span>
    </span>
  );
}
