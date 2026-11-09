import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * `Section` del móvil (`components/layout.tsx`): título 17/600 en minúscula
 * tipográfica, glifo opcional en tono secundario y 12 de hueco hasta lo que
 * rotula. Sin versalitas ni iconos en cada sección por obligación.
 */
export function Section({
  title,
  icon: Icon,
  action,
  children,
  className,
}: Readonly<{
  title: string;
  icon?: LucideIcon;
  /** Atajo a la derecha del título («Ver todo»). */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}>) {
  return (
    <section className={cn('grid gap-3', className)}>
      <div className="flex items-center gap-2">
        {Icon ? <Icon aria-hidden className="size-4 text-[var(--text-muted)]" /> : null}
        <h2 className="t-headline flex-1">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
