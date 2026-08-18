import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-11 w-full rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-low)] px-3 text-base text-[var(--text)] placeholder:text-[var(--text-disabled)] transition-all duration-200 hover:border-[var(--border)] focus:border-[var(--volt)] focus:bg-[var(--surface)] focus:shadow-[0_0_0_3px_rgb(var(--accent-channels)/0.14)] focus:outline-none disabled:opacity-50 sm:text-sm',
          className,
        )}
        {...props}
      />
    );
  },
);
