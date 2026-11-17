import { findGymWebHref, gymGateCopy, type GymGateStatus } from '@gymsheet/domain';
import { Building2 } from 'lucide-react';
import { ButtonLink } from '@/shared/components/ui/button';

/**
 * What a gym-scoped read (ranking, members) shows without a confirmed SOCIO:
 * `403 GYM_MEMBERSHIP_REQUIRED` is a state with a next step, never an error.
 */
export function GymGateState({ status, compact = false }: Readonly<{ status: GymGateStatus; compact?: boolean }>) {
  const copy = gymGateCopy(status);
  return (
    <div className={compact ? 'grid gap-3' : 'grid justify-items-start gap-3 rounded-[var(--radius-lg)] bg-[var(--surface)] px-5 py-5'} data-testid="gym-gate">
      <p className="flex items-center gap-2 font-semibold">
        <Building2 aria-hidden className="size-4 text-[var(--text-muted)]" />
        {copy.title}
      </p>
      <p className="t-subhead text-[var(--text-muted)]">{copy.message}</p>
      <ButtonLink href={status === 'REQUESTED' ? '/mi-gimnasio' : findGymWebHref} size="sm" variant={status === 'REQUESTED' ? 'ghost' : 'primary'}>
        {copy.action}
      </ButtonLink>
    </div>
  );
}
