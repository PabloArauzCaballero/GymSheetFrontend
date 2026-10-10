import { Badge } from '@/shared/components/ui/badge';

/**
 * Urgencia, dicha con una palabra y un color.
 *
 * El backend la manda como número porque es criterio de ordenación; aquí se
 * traduce, porque «3» no le dice a nadie que hay una denuncia por un menor
 * esperando.
 */
export function SeverityBadge({ severity }: Readonly<{ severity: number }>) {
  if (severity >= 3) return <Badge tone="danger">Urgente</Badge>;
  if (severity === 2) return <Badge tone="warning">Prioritario</Badge>;
  return <Badge tone="neutral">Normal</Badge>;
}

/** Cómo se llama la sanción que toca, antes de aplicarla. */
export function sanctionLabel(kind: string, days: number | null): string {
  if (kind === 'ADVERTENCIA') return 'una advertencia (sin suspensión)';
  if (kind === 'EXPULSION') return 'el cierre de la cuenta';
  return `una suspensión de ${days === 1 ? '1 día' : `${days} días`}`;
}

/** Clave de consulta de la cola, compartida por la lista y el panel. */
export const queueKey = ['admin', 'moderation', 'queue'] as const;
