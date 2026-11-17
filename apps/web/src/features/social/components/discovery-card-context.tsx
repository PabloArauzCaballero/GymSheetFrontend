import { BadgeCheck, Building2, MapPin, Navigation, Repeat, Sparkles, Sprout, Target, type LucideIcon } from 'lucide-react';
import {
  discoveryReasonChips,
  formatDistanceKm,
  isVerifiedCard,
  verifiedBadgeCopy,
  type DiscoveryReasonChipCode,
} from '@gymsheet/domain';
import { cn } from '@/shared/lib/cn';

/** Ranking context of a deck card: why it shows up and how far, never when. */
export type CardRanking = { reasons: readonly string[]; distanceKm: number | null };
type Tone = 'overlay' | 'surface';

const REASON_ICON: Record<DiscoveryReasonChipCode, LucideIcon> = {
  SAME_GYM: Building2,
  SAME_ROUTINE: Repeat,
  SAME_GOAL: Target,
  SHARED_INTERESTS: Sparkles,
  NEARBY: MapPin,
  NEW_HERE: Sprout,
};

const CHIP: Record<Tone, string> = {
  overlay: 'bg-[color-mix(in_srgb,var(--background)_70%,transparent)]',
  surface: 'border border-[var(--border-subtle)] bg-[var(--surface-high)] text-[var(--text)]',
};

/** Icon plus word, never color alone; the name says what the check means. */
export function VerifiedBadge({ tone = 'overlay' }: Readonly<{ tone?: Tone }>) {
  return (
    <span
      aria-label={verifiedBadgeCopy.accessibleName}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tracking-normal',
        tone === 'overlay'
          ? 'border border-white/30 bg-[rgb(var(--scrim-channels)/0.45)] text-white'
          : 'border border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-text)]',
      )}
      role="img"
    >
      <BadgeCheck aria-hidden className="size-3.5" />
      {verifiedBadgeCopy.label}
    </span>
  );
}

/** "a 2 km" as a chip; nothing when the backend could not place either side. */
export function DistanceChip({ km, tone = 'overlay' }: Readonly<{ km: number | null; tone?: Tone }>) {
  const label = formatDistanceKm(km);
  if (!label) return null;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums', CHIP[tone])}>
      <Navigation aria-hidden className="size-3 opacity-85" />
      {label}
    </span>
  );
}

/** Up to three reasons, in the shared order. Presence never becomes a chip. */
export function DiscoveryReasonChips({
  labelledBy,
  ranking,
  tone = 'overlay',
}: Readonly<{ labelledBy?: string; ranking: CardRanking; tone?: Tone }>) {
  const chips = discoveryReasonChips(ranking);
  if (chips.length === 0) return null;
  return (
    <ul aria-label={labelledBy ? undefined : 'Por qué aparece'} aria-labelledby={labelledBy} className="flex flex-wrap items-center gap-1.5">
      {chips.map(({ code, label }) => {
        const Icon = REASON_ICON[code];
        return (
          <li
            className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', CHIP[tone])}
            data-reason={code}
            key={code}
          >
            <Icon aria-hidden className="size-3 opacity-85" />
            {label}
          </li>
        );
      })}
    </ul>
  );
}

/** The detail sheet's version: badge, distance and reasons on a plain surface. */
export function DiscoveryContextBlock({ ranking }: Readonly<{ ranking: CardRanking }>) {
  const verified = isVerifiedCard(ranking);
  const chips = discoveryReasonChips(ranking);
  if (!verified && chips.length === 0 && formatDistanceKm(ranking.distanceKm) === null) return null;
  return (
    <section aria-labelledby="discovery-context-title" className="grid gap-3">
      <h3 className="data-label text-[var(--text-muted)]" id="discovery-context-title">
        Por qué aparece
      </h3>
      <div className="flex flex-wrap items-center gap-1.5">
        {verified ? <VerifiedBadge tone="surface" /> : null}
        <DistanceChip km={ranking.distanceKm} tone="surface" />
      </div>
      <DiscoveryReasonChips labelledBy="discovery-context-title" ranking={ranking} tone="surface" />
    </section>
  );
}
