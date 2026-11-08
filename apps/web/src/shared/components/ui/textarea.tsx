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
        'min-h-28 w-full resize-y rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[17px] leading-6 text-[var(--text)] placeholder:text-[var(--text-muted)] transition-[border-color,background-color,box-shadow] duration-[var(--dur-2)] hover:border-[var(--text-disabled)] focus:border-[var(--volt)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--volt)_22%,transparent)] focus:outline-none aria-[invalid=true]:border-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
});
