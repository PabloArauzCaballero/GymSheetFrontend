import type { LucideIcon } from 'lucide-react';
import { metricColor, type MetricKey } from '@/shared/theme/metric-colors';

/**
 * Glifo con color por significado (`IconBadge` del móvil): tinte al 14 %,
 * filo al 32 % y la tinta de la magnitud. Radio 16 desde 36 px, 12 por debajo.
 */
export function IconBadge({
  icon: Icon,
  tone,
  size = 32,
}: Readonly<{ icon: LucideIcon; tone: MetricKey; size?: number }>) {
  const color = metricColor(tone);
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center border"
      style={{
        width: size,
        height: size,
        borderRadius: size >= 36 ? 16 : 12,
        borderColor: color.edge,
        background: color.tint,
        color: color.ink,
      }}
    >
      <Icon className={size >= 36 ? 'size-5' : 'size-4'} />
    </span>
  );
}
