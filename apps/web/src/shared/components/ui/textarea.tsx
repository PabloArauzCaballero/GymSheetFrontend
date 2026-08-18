import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'min-h-28 w-full resize-y rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-low)] px-3 py-3 text-base leading-6 text-[var(--text)] placeholder:text-[var(--text-disabled)] transition-all duration-200 hover:border-[var(--border)] focus:border-[var(--volt)] focus:bg-[var(--surface)] focus:shadow-[0_0_0_3px_rgb(var(--accent-channels)/0.14)] focus:outline-none disabled:opacity-50 sm:text-sm',
        className,
      )}
      {...props}
    />
  );
});
