'use client';

import { Check, LoaderCircle, X } from 'lucide-react';
import { handleCopy, type HandleCheck } from '@gymsheet/domain';
import { ChoiceChip } from '@/shared/components/ui/choice-chip';
import { Field } from '@/shared/components/ui/field';
import { InputWithIcon } from '@/shared/components/ui/input';

/** What the line under the field says for each check; the icon is never the only cue. */
function statusOf(check: HandleCheck): { text: string; tone: 'muted' | 'ok' | 'bad' } {
  switch (check.state) {
    case 'checking':
      return { text: handleCopy.checking, tone: 'muted' };
    case 'available':
      return { text: handleCopy.available(check.handle), tone: 'ok' };
    case 'invalid':
    case 'unavailable':
      return { text: check.message, tone: 'bad' };
    case 'error':
      return { text: check.message, tone: 'muted' };
    default:
      return { text: handleCopy.hint, tone: 'muted' };
  }
}

const TONE_CLASS = {
  muted: 'text-[var(--text-muted)]',
  ok: 'text-[var(--success-text)]',
  bad: 'text-[var(--danger-text)]',
} as const;

/**
 * The `@handle` with its live verdict (debounced by `useHandleAvailability`)
 * and, when the typed one is not free, the suggestions from the name.
 */
export function HandleField({
  value,
  onChange,
  check,
  suggestions,
  error,
}: Readonly<{
  value: string;
  onChange: (value: string) => void;
  check: HandleCheck;
  suggestions: readonly string[];
  /** The claim's refusal (`PUT /business/me/handle`), which wins over the live check. */
  error?: string;
}>) {
  const status = statusOf(check);
  const offer = check.state === 'unavailable' || check.state === 'idle' ? suggestions.filter((handle) => handle !== value) : [];
  return (
    <div className="grid gap-2">
      <Field error={error} htmlFor="handle" label={handleCopy.label}>
        <InputWithIcon
          aria-describedby="handle-status"
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          icon={<span className="text-[17px] font-semibold">@</span>}
          id="handle"
          inputMode="text"
          maxLength={40}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          value={value}
        />
      </Field>
      <p aria-live="polite" className={`flex items-center gap-1.5 text-[13px] leading-5 ${TONE_CLASS[status.tone]}`} id="handle-status">
        {check.state === 'checking' ? <LoaderCircle aria-hidden className="size-3.5 animate-spin motion-reduce:animate-none" /> : null}
        {check.state === 'available' ? <Check aria-hidden className="size-3.5" /> : null}
        {status.tone === 'bad' ? <X aria-hidden className="size-3.5" /> : null}
        {status.text}
      </p>
      {offer.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-[var(--text-muted)]">{handleCopy.suggestionsLabel}</span>
          {offer.map((handle) => (
            <ChoiceChip key={handle} onClick={() => onChange(handle)} selected={false}>
              @{handle}
            </ChoiceChip>
          ))}
        </div>
      ) : null}
    </div>
  );
}
