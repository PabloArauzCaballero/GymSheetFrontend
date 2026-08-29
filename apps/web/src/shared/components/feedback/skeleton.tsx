import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Placeholders con la FORMA del contenido que va a llegar.
 *
 * `LoadingPanel` pinta el mismo bloque en todas las pantallas, así que la carga
 * no se parece a lo que aparece después y el layout salta al resolver. Estos
 * skeletons replican la geometría real (fila de métricas, rejilla de tarjetas,
 * lista, detalle) para que la transición sea un relleno, no un reemplazo.
 *
 * A11y: sólo el contenedor (`SkeletonScreen`) anuncia; las piezas son
 * decorativas y van `aria-hidden`. El shimmer lo neutraliza la regla global de
 * `prefers-reduced-motion` en `animations.css`.
 */

export function Skeleton({
  className,
  tone = 'low',
}: Readonly<{ className?: string; tone?: 'low' | 'high' }>) {
  return (
    <div
      aria-hidden
      className={cn(
        'shimmer relative overflow-hidden rounded-[6px]',
        tone === 'high' ? 'bg-[var(--surface-high)]' : 'bg-[var(--surface-low)]',
        className,
      )}
    />
  );
}

/**
 * Envoltorio que anuncia la carga una sola vez. Todo skeleton visible debe ir
 * dentro de uno de estos (o de `LoadingPanel`), nunca suelto: si no, un lector
 * de pantalla se queda en silencio mientras la pantalla parpadea.
 */
export function SkeletonScreen({
  children,
  label = 'Cargando',
  className,
}: Readonly<{ children: ReactNode; label?: string; className?: string }>) {
  return (
    <div aria-busy="true" aria-label={label} className={cn('grid gap-6', className)} role="status">
      {children}
    </div>
  );
}

/** Párrafo: última línea corta, como el texto real. */
export function SkeletonText({
  lines = 3,
  className,
}: Readonly<{ lines?: number; className?: string }>) {
  return (
    <div className={cn('grid gap-2.5', className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          className={cn('h-3.5 rounded', index === lines - 1 ? 'w-2/5' : 'w-full')}
          key={index}
        />
      ))}
    </div>
  );
}

/** Encabezado de página: eyebrow + título fluido + descripción, con su borde. */
export function SkeletonPageHeader({ withActions = false }: Readonly<{ withActions?: boolean }>) {
  return (
    <div className="flex flex-col gap-5 border-b border-[var(--border-subtle)] pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="grid w-full max-w-3xl gap-4">
        <Skeleton className="h-3 w-32 rounded" />
        <Skeleton className="h-9 w-3/5 min-w-48 rounded" tone="high" />
        <Skeleton className="h-3.5 w-4/5 rounded" />
      </div>
      {withActions ? <Skeleton className="h-10 w-full rounded-[8px] sm:w-36" /> : null}
    </div>
  );
}

/** Fila de `MetricCard`: mismo `min-h-32`, mismo grid responsive. */
export function SkeletonMetricRow({ count = 4 }: Readonly<{ count?: number }>) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div className="panel flex min-h-32 flex-col justify-between p-5" key={index}>
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="size-9 rounded-[6px]" />
          </div>
          <Skeleton className="mt-5 h-8 w-24 rounded" tone="high" />
        </div>
      ))}
    </div>
  );
}

/** Rejilla de tarjetas (ejercicios, rutinas, sesiones). */
export function SkeletonCardGrid({
  count = 6,
  withMedia = false,
}: Readonly<{ count?: number; withMedia?: boolean }>) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div className="panel overflow-hidden" key={index}>
          {withMedia ? <Skeleton className="h-36 w-full rounded-none" /> : null}
          <div className="grid gap-3 p-5">
            <Skeleton className="h-4 w-3/5 rounded" tone="high" />
            <Skeleton className="h-3 w-full rounded" />
            <div className="mt-1 flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Lista de filas con avatar/icono + dos líneas (chat, notificaciones, accesos).
 * `variant`: `grouped` = un panel con separadores; `stacked` = tarjetas sueltas
 * separadas por hueco, que es como se pintan las listas de entrenamientos y
 * conversaciones. Elegir mal la variante deja un borde de más o de menos
 * justo donde el ojo estaba esperando la lista real.
 */
export function SkeletonList({
  rows = 5,
  withAvatar = true,
  variant = 'grouped',
}: Readonly<{ rows?: number; withAvatar?: boolean; variant?: 'grouped' | 'stacked' }>) {
  const items = Array.from({ length: rows }, (_, index) => (
    <div
      className={cn(
        'flex items-center gap-4 p-4',
        variant === 'stacked' && 'panel rounded-[var(--radius-lg)]',
      )}
      key={index}
    >
      {withAvatar ? <Skeleton className="size-10 shrink-0 rounded-full" /> : null}
      <div className="grid min-w-0 flex-1 gap-2">
        <Skeleton className="h-3.5 w-2/5 rounded" tone="high" />
        <Skeleton className="h-3 w-4/5 rounded" />
      </div>
      <Skeleton className="hidden h-3 w-16 shrink-0 rounded sm:block" />
    </div>
  ));

  return variant === 'stacked' ? (
    <div className="grid gap-3">{items}</div>
  ) : (
    <div className="panel divide-y divide-[var(--border-subtle)]">{items}</div>
  );
}

/** Hilo de chat: burbujas alternas, anchos irregulares como el habla real. */
export function SkeletonThread({ bubbles = 6 }: Readonly<{ bubbles?: number }>) {
  const widths = ['w-3/5', 'w-2/5', 'w-4/5', 'w-1/2', 'w-3/5', 'w-1/3'];
  return (
    <div className="grid gap-3">
      {Array.from({ length: bubbles }, (_, index) => (
        <Skeleton
          className={cn(
            'h-12 rounded-[12px]',
            widths[index % widths.length],
            index % 2 === 1 && 'justify-self-end',
          )}
          key={index}
          tone={index % 2 === 1 ? 'high' : 'low'}
        />
      ))}
    </div>
  );
}

/** Detalle: panel principal ancho + columna lateral. */
export function SkeletonDetail() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="panel grid gap-5 p-5">
        <Skeleton className="h-48 w-full rounded-[8px]" />
        <Skeleton className="h-5 w-2/5 rounded" tone="high" />
        <SkeletonText lines={4} />
      </div>
      <div className="grid gap-4">
        {Array.from({ length: 2 }, (_, index) => (
          <div className="panel grid gap-3 p-5" key={index}>
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-7 w-20 rounded" tone="high" />
            <SkeletonText lines={2} />
          </div>
        ))}
      </div>
    </div>
  );
}
