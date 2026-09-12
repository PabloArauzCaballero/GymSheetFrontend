import type { ProgressionLevel } from '@/shared/api/schemas';
import { cn } from '@/shared/lib/cn';
import { PATH_NODE_SIZE, withAlpha } from './progression-colors';
import { ProgressionIcon } from './progression-icon';

/**
 * Un hito del camino.
 *
 * Tres estados y los tres se leen: conseguido (color propio), actual (anillo que
 * late) y pendiente (apagado, con su nombre y sus puntos a la vista). Los
 * pendientes **no** se ocultan ni se tapan con interrogantes: un camino con la
 * meta escondida no tira de nadie.
 *
 * Es el reflejo exacto del nodo del móvil: misma geometría, mismos estados,
 * mismos textos. Solo cambia el medio.
 */
export function PathNode({
  level,
  isLast,
  points,
}: Readonly<{
  level: ProgressionLevel;
  isLast: boolean;
  /** Puntos actuales, para decir cuánto falta exactamente. */
  points: number;
}>) {
  const reached = level.unlocked;
  const remaining = Math.max(0, level.minPoints - points);

  return (
    <li className="flex gap-4">
      {/* Columna del raíl: el nodo y la línea que baja al siguiente. */}
      <div className="flex flex-col items-center" style={{ width: PATH_NODE_SIZE }}>
        <div
          className="relative flex shrink-0 items-center justify-center"
          style={{ width: PATH_NODE_SIZE, height: PATH_NODE_SIZE }}
        >
          {level.current ? (
            <span
              aria-hidden
              className="absolute inset-0 rounded-full border-2 motion-safe:animate-[progression-heartbeat_2.4s_ease-in-out_infinite]"
              style={{ borderColor: level.color }}
            />
          ) : null}
          <span
            className="flex items-center justify-center rounded-full border"
            style={{
              width: PATH_NODE_SIZE - 10,
              height: PATH_NODE_SIZE - 10,
              borderColor: reached ? level.color : 'var(--border)',
              backgroundColor: reached ? withAlpha(level.color, 0.16) : 'var(--surface-high)',
            }}
          >
            <ProgressionIcon
              className="h-5 w-5"
              name={level.icon}
              style={{ color: reached ? level.color : 'var(--text-disabled)' }}
            />
          </span>
        </div>
        {isLast ? null : (
          <span
            aria-hidden
            className="w-0.5 flex-1"
            style={{
              minHeight: 24,
              // El tramo recorrido se ve como una línea continua encendida; el
              // que queda, como una guía apagada.
              backgroundColor: reached ? withAlpha(level.color, 0.5) : 'var(--border-subtle)',
            }}
          />
        )}
      </div>

      <div className="grid flex-1 gap-1 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'text-base font-semibold',
              reached ? 'text-[var(--text)]' : 'text-[var(--text-disabled)]',
            )}
          >
            {level.name}
          </span>
          {/* El unico chip de la aplicacion que NO late, y a proposito: esta
              pegado al nodo cuyo anillo ya late, y late para decir exactamente
              lo mismo que el —«estas aqui»—. Dos latidos juntos, a distinto
              ritmo (el del anillo va sincronizado con el del movil, 2.4 s), se
              leen como un fallo de pintado en vez de como un acento. */}
          {level.current ? (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
              style={{ backgroundColor: withAlpha(level.color, 0.18), color: level.color }}
            >
              Estás aquí
            </span>
          ) : null}
        </div>
        <p
          className={cn(
            'text-sm leading-6',
            reached ? 'text-[var(--text-muted)]' : 'text-[var(--text-disabled)]',
          )}
        >
          {level.tagline}
        </p>
        {reached ? null : (
          <p className="text-xs text-[var(--text-disabled)]">
            {`Te faltan ${remaining.toLocaleString('es-ES')} puntos`}
          </p>
        )}
      </div>
    </li>
  );
}
