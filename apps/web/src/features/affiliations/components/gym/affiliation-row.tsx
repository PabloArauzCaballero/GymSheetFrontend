import { affiliationKindLabels, ciEndingText, gymAffiliationName, sellerBadgeCopy } from '@gymsheet/domain';
import type { GymAffiliation } from '@/shared/api/schemas';
import { PersonAvatar } from '@/shared/components/media/person-avatar';
import { Badge } from '@/shared/components/ui/badge';
import { formatDate } from '@/shared/lib/date';
import type { PlanChip } from '@/features/subscriptions/components/business/use-socio-plans';
import { AffiliationDecision } from './affiliation-decision';

/**
 * A row of «Socios» (plan §4.2): photo, name, sede, date and «CI termina en
 * 123» for a person; name, @handle and badge for a coach business; a SOCIO's
 * plan status (franja 8e). Nothing else about anyone.
 */
export function AffiliationRow({ row, plan = null }: Readonly<{ row: GymAffiliation; plan?: PlanChip | null }>) {
  const subject = row.subject;
  const name = gymAffiliationName(row);
  const ci = ciEndingText(subject);
  const photo = subject?.type === 'PERSON' ? subject.photoUrl : (subject?.logoUrl ?? null);
  const date = row.status === 'REQUESTED' ? `Pidió el ${formatDate(row.requestedAt)}` : row.confirmedAt ? `Desde el ${formatDate(row.confirmedAt)}` : null;
  return (
    <li className="panel grid gap-4 px-5 py-4" data-testid="affiliation-row">
      <div className="flex items-start gap-4">
        <PersonAvatar name={name} photoUrl={photo} size="md" />
        <div className="grid min-w-0 flex-1 gap-1">
          <p className="truncate font-semibold">{name}</p>
          <p className="t-subhead text-[var(--text-muted)]">
            {[
              affiliationKindLabels[row.kind],
              subject?.type === 'BUSINESS' ? [subject.handle ? `@${subject.handle}` : null, sellerBadgeCopy[subject.badge]].filter(Boolean).join(' · ') : null,
              row.location?.name,
              date,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {ci ? <p className="t-subhead font-semibold tabular-nums">{ci}</p> : null}
        </div>
        {plan ? <Badge tone={plan.tone}>{plan.label}</Badge> : null}
      </div>
      <AffiliationDecision row={row} />
    </li>
  );
}
