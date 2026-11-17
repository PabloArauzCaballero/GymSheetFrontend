'use client';

import { SOCIAL_BIO_MAX } from '@/shared/api/schemas';
import { Field } from '@/shared/components/ui/field';
import { Textarea } from '@/shared/components/ui/textarea';

/**
 * Short free text with a live counter. `maxLength` stops typing at the limit;
 * links and phone numbers are rejected by the backend, whose message the
 * container shows.
 */
export function BioField({
  value,
  onChange,
}: Readonly<{ value: string; onChange: (next: string) => void }>) {
  const remaining = SOCIAL_BIO_MAX - value.length;
  return (
    <div className="grid gap-1.5">
      <Field hint="Sin enlaces ni teléfonos." label="Tu bio">
        <Textarea
          maxLength={SOCIAL_BIO_MAX}
          onChange={(event) => onChange(event.target.value.slice(0, SOCIAL_BIO_MAX))}
          placeholder="Entreno por las mañanas y busco a alguien para las sentadillas…"
          rows={5}
          value={value}
        />
      </Field>
      <p
        aria-live="polite"
        className={`t-footnote justify-self-end tabular-nums ${remaining <= 20 ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}
      >
        {`${value.length}/${SOCIAL_BIO_MAX}`}
      </p>
    </div>
  );
}
