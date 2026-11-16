import type { VerificationView } from '@gymsheet/domain';
import { BadgeCheck, CircleAlert, Clock, ScanFace, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

const TONE: Record<VerificationView['tone'], { icon: LucideIcon; className: string }> = {
  neutral: { icon: ScanFace, className: 'bg-[var(--surface-high)] text-[var(--text-muted)]' },
  info: { icon: Clock, className: 'bg-[var(--info-bg)] text-[var(--info-text)]' },
  success: { icon: BadgeCheck, className: 'bg-[var(--success-bg)] text-[var(--success-text)]' },
  warning: { icon: CircleAlert, className: 'bg-[var(--warning-bg)] text-[var(--warning-text)]' },
};

/** One verification state: glyph, title and one line. The status is in words, never only in colour. */
export function VerificationStatusView({
  view,
  action,
  compact = false,
}: Readonly<{ view: Pick<VerificationView, 'tone' | 'title' | 'body'>; action?: ReactNode; compact?: boolean }>) {
  const { icon: Icon, className } = TONE[view.tone];
  return (
    <div
      className={cn('flex gap-4', compact ? 'items-start' : 'panel flex-col items-center px-6 py-8 text-center')}
      data-testid="verification-status"
      role="status"
    >
      <span aria-hidden className={cn('grid shrink-0 place-items-center rounded-full', compact ? 'size-10' : 'size-14', className)}>
        <Icon className={compact ? 'size-5' : 'size-7'} />
      </span>
      <div className={cn('grid min-w-0 gap-1', compact ? 'flex-1' : 'justify-items-center')}>
        <p className="t-headline">{view.title}</p>
        <p className="t-subhead max-w-md text-[var(--text-muted)]">{view.body}</p>
        {action ? <div className={cn('mt-2 flex flex-wrap gap-2', compact ? '' : 'justify-center')}>{action}</div> : null}
      </div>
    </div>
  );
}
