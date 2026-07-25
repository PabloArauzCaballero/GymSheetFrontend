import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: Readonly<{
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}>) {
  return (
    <div className={cn('grid gap-2', className)}>
      <label className="data-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? <p className="text-sm text-[#ffb4ab]">{error}</p> : null}
      {!error && hint ? <p className="text-xs leading-5 text-[var(--text-muted)]">{hint}</p> : null}
    </div>
  );
}
