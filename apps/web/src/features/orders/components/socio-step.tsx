'use client';

import { affiliationCopy, ciDigitsOf, joinGymErrors, subscriptionCopy, type JoinGymForm } from '@gymsheet/domain';
import type { PublicLocation } from '@/shared/api/schemas';
import { Skeleton } from '@/shared/components/feedback/skeleton';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';

/**
 * Step 2 of the checkout for a gym membership (plan §4.3): the sede and the
 * last 3 CI digits, the same two fields as «Hacerme socio». The gym compares
 * them when it confirms the payment.
 */
export function SocioStep({
  form,
  locations,
  tried,
  onChange,
}: Readonly<{ form: JoinGymForm; locations: PublicLocation[] | null; tried: boolean; onChange: (patch: Partial<JoinGymForm>) => void }>) {
  const errors = locations ? joinGymErrors(form, locations) : {};
  return (
    <div className="grid gap-5" data-testid="checkout-socio-step">
      <div className="grid gap-1">
        <h3 className="t-headline">{subscriptionCopy.socioTitle}</h3>
        <p className="t-subhead text-[var(--text-muted)]">{subscriptionCopy.socioBody}</p>
      </div>
      {locations === null ? (
        <Skeleton className="h-24 rounded-[var(--radius-lg)]" />
      ) : (
        <fieldset aria-describedby={tried && errors.locationId ? 'checkout-sede-error' : undefined} className="grid gap-2">
          <legend className="data-label mb-2">Tu sede</legend>
          {locations.map((location) => (
            <label className="choice-card gap-0.5 rounded-[var(--radius-lg)] px-4 py-3" key={location.id}>
              <input checked={form.locationId === location.id} className="sr-only" name="locationId" onChange={() => onChange({ locationId: location.id })} type="radio" value={location.id} />
              <span className="font-semibold">{location.name}</span>
              {location.address || location.city ? <span className="t-footnote text-[var(--text-muted)]">{[location.address, location.city].filter(Boolean).join(', ')}</span> : null}
            </label>
          ))}
          {tried && errors.locationId ? (
            <p className="t-subhead text-[var(--danger-text)]" id="checkout-sede-error" role="alert">
              {errors.locationId}
            </p>
          ) : null}
        </fieldset>
      )}
      <Field error={tried ? errors.ciLast3 : undefined} hint={affiliationCopy.ciHint} label={affiliationCopy.ciLabel}>
        <Input
          autoComplete="off"
          className="max-w-32 text-center text-xl tracking-[0.4em] tabular-nums"
          inputMode="numeric"
          maxLength={3}
          name="ciLast3"
          onChange={(event) => onChange({ ciLast3: ciDigitsOf(event.target.value) })}
          pattern="[0-9]{3}"
          placeholder="123"
          spellCheck={false}
          value={form.ciLast3}
        />
      </Field>
    </div>
  );
}
