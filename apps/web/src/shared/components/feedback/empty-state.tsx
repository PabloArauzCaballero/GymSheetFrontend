import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import type { MascotMood } from '@gymsheet/design-tokens/repi';
import { Repi } from '@/shared/components/media/repi';

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
  mascot,
}: Readonly<{
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  level?: 2 | 3;
  /** Sin tarjeta: el estado vacío vive directo sobre el fondo (como el móvil plano). */
  flat?: boolean;
  /** Repi en lugar del glifo (y sin tarjeta: la ilustración ya hace de superficie). */
  mascot?: MascotMood;
}>) {
  const Heading = level === 3 ? 'h3' : 'h2';
  const bare = flat || Boolean(mascot);
  return (
    // `EmptyState` del móvil (`CenteredState`): tarjeta e1 centrada, glifo de
    // 32 en tono apagado, título `headline` y mensaje `subhead`.
    <div className={bare ? 'grid justify-items-center gap-2 px-6 py-10 text-center' : 'panel grid justify-items-center gap-2 px-6 py-8 text-center'}>
      {mascot ? (
        <Repi className="mb-1 size-28" mood={mascot} size={112} />
      ) : (
        <span aria-hidden className="text-[var(--text-muted)] [&>svg]:size-8">
          {icon ?? <Inbox />}
        </span>
      )}
      <Heading className="t-headline">{title}</Heading>
      <p className="t-subhead max-w-md text-[var(--text-muted)]">{description}</p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
