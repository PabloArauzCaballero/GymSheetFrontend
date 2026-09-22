import type { Metadata } from 'next';
import { AuditPanel } from '@/features/admin/components/audit-panel';

export const metadata: Metadata = { title: 'Auditoría global' };

/**
 * El mismo panel que la consola del gimnasio, con el alcance cambiado.
 *
 * No hace falta pedir un endpoint distinto: `/admin/audit` resuelve el alcance
 * desde la sesión, y la de un `SYSTEM_ADMIN` no está atada a ningún gimnasio,
 * así que esta página recibe la plataforma entera. `scope` sólo decide cómo se
 * presenta: con columna de gimnasio, porque aquí sí hay más de uno.
 */
export default function SistemaAuditoriaPage() {
  return <AuditPanel scope="platform" />;
}
