import { pendingProfileItems } from '@gymsheet/domain';
import type { ProfileCompletion } from '@/shared/api/schemas';
import { PointsChip } from './completion-nudge';

/** Lo que una sección todavía paga, con la misma cifra que prometió el perfil. */
export function PendingPoints({ completion, codes }: Readonly<{ completion: ProfileCompletion | undefined; codes: readonly string[] }>) {
  const pending = pendingProfileItems(completion?.items ?? []).filter((item) => codes.includes(item.code));
  if (pending.length === 0) return null;
  return (
    <ul className="grid gap-1.5">
      {pending.map((item) => (
        <li className="flex flex-wrap items-center gap-x-2 gap-y-1" key={item.code}>
          <PointsChip points={item.points} />
          <span className="t-footnote min-w-0 text-pretty text-[var(--text-muted)] [overflow-wrap:anywhere]">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
