import { sellerBadgeCopy } from '@gymsheet/domain';
import { BadgeCheck, Sparkles } from 'lucide-react';
import type { SellerBadge as Badge } from '@/shared/api/schemas';
import { cn } from '@/shared/lib/cn';

/** «Verificado por REPP» (a person at REPP approved it) or «Nuevo» (approved by the automatic checks). */
export function SellerBadge({ badge, className }: Readonly<{ badge: Badge; className?: string }>) {
  const Icon = badge === 'VERIFIED' ? BadgeCheck : Sparkles;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[13px] font-semibold', badge === 'VERIFIED' ? 'text-[var(--info-text)]' : 'text-[var(--text-muted)]', className)}>
      <Icon aria-hidden className="size-3.5 shrink-0" />
      {sellerBadgeCopy[badge]}
    </span>
  );
}
