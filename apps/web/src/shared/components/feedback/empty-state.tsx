import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

/**
 * El hueco cuando no hay nada que enseñar.
 *
 * El título va en `h2` y no en `h3`. Cuando la lista está vacía, este bloque es
 * lo ÚNICO que hay bajo el `h1` de la pantalla, así que un `h3` saltaba un
 * nivel y dejaba a quien navega por encabezados sin forma de llegar al
 * contenido — seis pantallas lo incumplían a la vez (axe: heading-order).
 * Donde el bloque sí cuelga de una sección con su propio `h2`, `h2` es un
 * hermano y sigue siendo correcto; `level` permite bajarlo si alguna vez hace
 * falta anidarlo más.
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
  level = 2,
}: Readonly<{
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  level?: 2 | 3;
}>) {
  const Heading = level === 3 ? 'h3' : 'h2';
  return (
    <div className="reveal grid min-h-56 place-items-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface-lowest)] p-8 text-center">
      <div className="grid max-w-md justify-items-center gap-3">
        <div className="grid size-14 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface-low)] text-[var(--text-muted)]">
          {icon ?? <Inbox className="size-6" />}
        </div>
        <Heading className="mt-1 text-lg font-semibold tracking-[-0.02em]">{title}</Heading>
        <p className="text-sm leading-6 text-[var(--text-muted)]">{description}</p>
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  );
}
