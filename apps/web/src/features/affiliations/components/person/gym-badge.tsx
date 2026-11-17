import { gymBadgeLabel } from '@gymsheet/domain';
import { BadgeCheck } from 'lucide-react';
import type { GymBadge as Badge } from '@/shared/api/schemas';
import { cn } from '@/shared/lib/cn';

/**
 * «Socio de X»: computed by the backend from a confirmed membership the
 * person shows (ADR-0027). Word plus icon, never color alone.
 */
export function GymBadge({ badge, tone = 'surface' }: Readonly<{ badge: Badge | null | undefined; tone?: 'overlay' | 'surface' }>) {
  const label = gymBadgeLabel(badge);
  if (!label) return null;
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        tone === 'overlay' ? 'bg-[color-mix(in_srgb,var(--background)_70%,transparent)]' : 'border border-[var(--border-subtle)] bg-[var(--surface-high)] text-[var(--text)]',
      )}
      data-testid="gym-badge"
    >
      <BadgeCheck aria-hidden className="size-3.5 shrink-0 opacity-85" />
      <span className="truncate">{label}</span>
    </span>
  );
}
