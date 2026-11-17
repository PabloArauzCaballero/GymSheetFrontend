'use client';

import { useId } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { signupSexOptions } from '@gymsheet/domain';
import { signupCopy } from '@/features/auth/lib/signup';

/**
 * Required sex at signup: two native radios drawn as a segmented control.
 *
 * Native radios on purpose: nothing is chosen until the person picks (a
 * segmented button group always shows one as active), arrows move between
 * options, react-hook-form focuses the group on error and screen readers
 * announce «botón de radio, 1 de 2». The look matches the 48 px text fields.
 */
export function SexField({
  registration,
  error,
}: Readonly<{ registration: UseFormRegisterReturn<'genero'>; error?: string }>) {
  const errorId = useId();
  return (
    <fieldset
      aria-describedby={error ? errorId : undefined}
      aria-invalid={error ? true : undefined}
      className="grid min-w-0 gap-1.5"
    >
      <legend className="mb-1.5 text-[15px] leading-5 text-[var(--text-muted)]">
        {signupCopy.sex.label}
      </legend>
      <div
        className={
          'grid h-12 grid-cols-2 gap-0.5 rounded-[var(--radius-md)] border bg-[var(--surface)] p-0.5 transition-[border-color] duration-[var(--dur-2)] ' +
          (error ? 'border-[var(--danger)]' : 'border-[var(--border)]')
        }
      >
        {signupSexOptions.map((option) => (
          <label
            className="grid cursor-pointer place-items-center rounded-[calc(var(--radius-md)-3px)] text-[15px] font-medium text-[var(--text-muted)] transition-[background-color,color] duration-[var(--dur-1)] hover:text-[var(--text)] has-[:checked]:bg-[var(--surface-highest)] has-[:checked]:font-semibold has-[:checked]:text-[var(--text)] has-[:checked]:shadow-[var(--shadow-sm)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--accent-ink)] motion-reduce:transition-none"
            key={option.value}
          >
            <input className="sr-only" type="radio" value={option.value} {...registration} />
            {option.label}
          </label>
        ))}
      </div>
      {error ? (
        <p className="text-xs text-[var(--danger)]" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
