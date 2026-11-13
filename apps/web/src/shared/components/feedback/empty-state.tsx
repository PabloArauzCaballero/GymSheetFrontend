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
  flat = false,
}: Readonly<{
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  level?: 2 | 3;
  /** Sin tarjeta: el estado vacío vive directo sobre el fondo (como el móvil plano). */
  flat?: boolean;
}>) {
  const Heading = level === 3 ? 'h3' : 'h2';
  return (
    // `EmptyState` del móvil (`CenteredState`): tarjeta e1 centrada, glifo de
    // 32 en tono apagado, título `headline` y mensaje `subhead`.
    <div className={flat ? 'grid justify-items-center gap-2 px-6 py-12 text-center' : 'panel grid justify-items-center gap-2 px-6 py-8 text-center'}>
      <span aria-hidden className="text-[var(--text-muted)] [&>svg]:size-8">
        {icon ?? <Inbox />}
      </span>
      <Heading className="t-headline">{title}</Heading>
      <p className="t-subhead max-w-md text-[var(--text-muted)]">{description}</p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
