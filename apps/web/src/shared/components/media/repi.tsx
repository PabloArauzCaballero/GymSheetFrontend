import { mascotXml, type MascotMood } from '@gymsheet/design-tokens/repi';

/**
 * Repi, la mascota de REPP: el mismo SVG que pinta el móvil
 * (`packages/design-tokens/src/repi.ts`). Va en un `<img>` con data URI: cada
 * Repi es un documento aparte, así que los `id` de su recorte no chocan cuando
 * hay varias en pantalla.
 *
 * Decorativa por defecto (`alt=""`): el texto de al lado ya dice lo que siente.
 */
export function Repi({
  mood,
  size = 72,
  className,
  label,
}: Readonly<{ mood: MascotMood; size?: number; className?: string; label?: string }>) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG en línea, sin optimizador que lo procese.
    <img
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      className={className}
      draggable={false}
      height={size}
      src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(mascotXml(mood))}`}
      width={size}
    />
  );
}
