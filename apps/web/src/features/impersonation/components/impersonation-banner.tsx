'use client';

import { Building2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useImpersonation } from '../use-impersonation';

/**
 * Persistent strip while the platform admin operates a gym: on every page,
 * under the top bar, so no action is ever taken on a gym without seeing which.
 * No dismiss: the only way out is «Salir», which drops the scoped token.
 */
export function ImpersonationBanner({ gymName }: Readonly<{ gymName: string }>) {
  const { stop } = useImpersonation();
  return (
    <aside
      aria-label="Gimnasio que operas"
      className="border-t border-[color-mix(in_srgb,var(--volt)_35%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--volt)_8%,var(--surface-low))]"
      data-testid="impersonation-banner"
    >
      <div className="mx-auto flex w-full max-w-[1200px] items-center gap-3 px-4 py-1.5 sm:px-6 lg:px-10">
        <Building2 aria-hidden className="size-4 shrink-0 text-[var(--accent-ink)]" />
        <p className="t-subhead min-w-0 flex-1 truncate text-[var(--text-muted)]">
          Operando <span className="font-semibold text-[var(--text)]">{gymName}</span>
        </p>
        <Button loading={stop.isPending} onClick={() => stop.mutate()} size="sm" variant="ghost">
          Salir
        </Button>
      </div>
    </aside>
  );
}
