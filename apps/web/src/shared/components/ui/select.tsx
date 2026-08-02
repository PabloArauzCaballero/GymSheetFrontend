import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          'h-11 w-full rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-low)] px-3 text-sm text-[var(--text)] transition-all duration-200 hover:border-[var(--border)] focus:border-[var(--volt)] focus:shadow-[0_0_0_3px_rgb(195_244_0/0.14)] focus:outline-none disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);
