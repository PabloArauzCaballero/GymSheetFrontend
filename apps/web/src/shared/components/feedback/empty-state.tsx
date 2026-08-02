import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({
  title,
  description,
  action,
  icon,
}: Readonly<{ title: string; description: string; action?: ReactNode; icon?: ReactNode }>) {
  return (
    <div className="reveal grid min-h-56 place-items-center rounded-[8px] border border-dashed border-[var(--border)] bg-[var(--surface-lowest)] p-8 text-center">
      <div className="grid max-w-md justify-items-center gap-3">
        <div className="animate-pop grid size-14 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface-low)] text-[var(--accent-ink)] shadow-[0_0_40px_-16px_rgb(195_244_0/0.5)]">
          {icon ?? <Inbox className="size-6" />}
        </div>
        <h3 className="mt-1 text-lg font-bold tracking-[-0.02em]">{title}</h3>
        <p className="text-sm leading-6 text-[var(--text-muted)]">{description}</p>
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  );
}
