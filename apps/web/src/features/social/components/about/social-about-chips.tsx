'use client';

import { useInterestCatalog } from '@/features/social/hooks/use-interest-catalog';

/** A static (non-interactive) chip on a surface. */
export const ABOUT_CHIP =
  'inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-1.5 text-sm';

/** Interest chips with catalog labels; unknown codes are dropped. */
export function InterestChips({
  codes,
  limit,
  className = ABOUT_CHIP,
}: Readonly<{ codes: string[]; limit?: number; className?: string }>) {
  const { labels } = useInterestCatalog();
  const known = codes.flatMap((code) => {
    const label = labels.get(code);
    return label ? [{ code, label }] : [];
  });
  if (known.length === 0) return null;
  const shown = limit ? known.slice(0, limit) : known;
  const hidden = known.length - shown.length;
  return (
    <ul aria-label="Intereses" className="flex flex-wrap gap-2">
      {shown.map((interest) => (
        <li className={className} key={interest.code}>
          {interest.label}
        </li>
      ))}
      {hidden > 0 ? <li className={className}>{`+${hidden}`}</li> : null}
    </ul>
  );
}
