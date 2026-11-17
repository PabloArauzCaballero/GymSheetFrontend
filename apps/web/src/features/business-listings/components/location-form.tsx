'use client';

import { hoursRows, locationCopy, locationFormErrors, type LocationForm, type LocationFormErrors } from '@gymsheet/domain';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';

type Part = 'where' | 'pin' | 'hours';
const PARTS: readonly Part[] = ['where', 'pin', 'hours'];
const PART_FIELDS: Readonly<Record<Part, ReadonlyArray<keyof LocationFormErrors>>> = { where: ['name', 'city'], pin: ['pin'], hours: ['hours'] };

/**
 * A location in three short parts: where (with the warning that the address
 * is published), the optional map pin as two numbers, and the opening hours
 * in three rows. Saving happens on the last part.
 */
export function LocationFormView({
  initial,
  saving,
  onSave,
  onCancel,
}: Readonly<{ initial: LocationForm; saving: boolean; onSave: (form: LocationForm) => void; onCancel: () => void }>) {
  const [form, setForm] = useState(initial);
  const [part, setPart] = useState<Part>('where');
  const [errors, setErrors] = useState<LocationFormErrors>({});
  const index = PARTS.indexOf(part);
  const patch = (next: Partial<LocationForm>) => setForm((current) => ({ ...current, ...next }));
  const hour = (row: (typeof hoursRows)[number]['id'], key: 'open' | 'close', value: string) =>
    setForm((current) => ({ ...current, hours: { ...current.hours, [row]: { ...current.hours[row], [key]: value } } }));

  function next() {
    const all = locationFormErrors(form);
    const found = Object.fromEntries(PART_FIELDS[part].filter((key) => all[key]).map((key) => [key, all[key]]));
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (index === PARTS.length - 1) onSave(form);
    else setPart(PARTS[index + 1] as Part);
  }

  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        next();
      }}
    >
      <p aria-live="polite" className="data-label">
        Paso {index + 1} de {PARTS.length}
      </p>
      {part === 'where' ? (
        <>
          <Field error={errors.name} label="Nombre de la sede">
            <Input autoComplete="off" maxLength={120} onChange={(event) => patch({ name: event.target.value })} placeholder="Sede Centro…" value={form.name} />
          </Field>
          <Field error={errors.city} label="Ciudad">
            <Input autoComplete="address-level2" maxLength={100} onChange={(event) => patch({ city: event.target.value })} value={form.city} />
          </Field>
          <Field hint={locationCopy.addressPublic} label="Dirección (opcional)">
            <Input autoComplete="street-address" maxLength={500} onChange={(event) => patch({ address: event.target.value })} value={form.address} />
          </Field>
        </>
      ) : null}
      {part === 'pin' ? (
        <fieldset className="grid gap-3">
          <legend className="t-subhead mb-1 text-[var(--text-muted)]">{locationCopy.pinHint}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Latitud">
              <Input autoComplete="off" inputMode="decimal" onChange={(event) => patch({ latitude: event.target.value })} placeholder="-16.5000" value={form.latitude} />
            </Field>
            <Field label="Longitud">
              <Input autoComplete="off" inputMode="decimal" onChange={(event) => patch({ longitude: event.target.value })} placeholder="-68.1500" value={form.longitude} />
            </Field>
          </div>
          {errors.pin ? (
            <p className="text-xs text-[var(--danger)]" role="alert">
              {errors.pin}
            </p>
          ) : null}
        </fieldset>
      ) : null}
      {part === 'hours' ? (
        <fieldset className="grid gap-3">
          <legend className="t-subhead mb-1 text-[var(--text-muted)]">Deja la fila vacía si ese día cierras.</legend>
          {hoursRows.map((row) => (
            <div className="grid grid-cols-[minmax(0,1fr)_6rem_6rem] items-center gap-2" key={row.id}>
              <span className="text-[15px]">{row.label}</span>
              <Input aria-label={`${row.label}: abre`} inputMode="numeric" onChange={(event) => hour(row.id, 'open', event.target.value)} placeholder="07:00" value={form.hours[row.id].open} />
              <Input aria-label={`${row.label}: cierra`} inputMode="numeric" onChange={(event) => hour(row.id, 'close', event.target.value)} placeholder="21:00" value={form.hours[row.id].close} />
            </div>
          ))}
          {errors.hours ? (
            <p className="text-xs text-[var(--danger)]" role="alert">
              {errors.hours}
            </p>
          ) : null}
        </fieldset>
      ) : null}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button onClick={() => (index === 0 ? onCancel() : setPart(PARTS[index - 1] as Part))} type="button" variant="ghost">
          {index === 0 ? 'Cancelar' : 'Atrás'}
        </Button>
        <Button loading={saving} type="submit" variant="primary">
          {index === PARTS.length - 1 ? 'Guardar sede' : 'Continuar'}
        </Button>
      </div>
    </form>
  );
}
