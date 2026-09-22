import type { ReactNode } from 'react';
import { requireRole } from '@/shared/server/session';

/**
 * Consola de plataforma.
 *
 * Separada de `(portal)/admin` a propósito: aquélla es la consola de UN
 * gimnasio y todo lo que muestra asume uno concreto detrás. Aquí no hay
 * gimnasio, hay todos, y mezclarlas obligaría a que cada pantalla se preguntara
 * cuál de los dos alcances está sirviendo.
 *
 * `requireRole` es sólo la puerta del cliente; quien autoriza de verdad es el
 * backend, que gatea estas rutas con `@Roles(SYSTEM_ADMIN)`.
 */
export default async function SistemaLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireRole(['SYSTEM_ADMIN']);
  return children;
}
