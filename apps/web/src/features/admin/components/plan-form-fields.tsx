'use client';

import { planTypes, type MembershipPlan } from '@/shared/api/contracts';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';

const currencies = ['CLP', 'USD', 'EUR', 'PEN', 'COP', 'MXN', 'ARS'] as const;

/** Lista separada por comas o saltos de línea → arreglo sin vacíos. */
export function parseList(value: string): string[] {
  return value
    .split(/[\n,]/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseReminderDays(value: string): number[] {
  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item >= 0);
}

/**
 * Precio del formulario. Vacío significa "plan sin precio publicado" (`null`),
 * distinto de cero: el backend usa la ausencia de precio para excluir el plan
 * del catálogo de compra.
 */
function parsePrice(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/** Extrae del formulario los atributos comerciales comunes a alta y edición. */
export function commercialFieldsFromForm(form: FormData) {
  const precio = parsePrice(String(form.get('precio') ?? ''));
  return {
    precio,
    // Sin precio la moneda no aporta nada y el backend la exige emparejada.
    moneda: precio === null ? null : String(form.get('moneda') || 'CLP'),
    beneficios: parseList(String(form.get('beneficios') ?? '')),
    orden: Number(form.get('orden') ?? 0) || 0,
    disponibleNuevo: form.get('disponibleNuevo') === 'on',
    disponibleRenovacion: form.get('disponibleRenovacion') === 'on',
    disponibleExtension: form.get('disponibleExtension') === 'on',
  };
}

export function formatPlanPrice(plan: MembershipPlan): string {
  if (plan.precio === null) return 'Sin precio';
  return new Intl.NumberFormat('es', {
    style: 'currency',
    currency: plan.moneda ?? 'CLP',
    maximumFractionDigits: 0,
  }).format(plan.precio);
}

/** Campos compartidos por el alta y la edición, para que ambas queden completas. */
export function PlanCommonFields({
  plan,
  branches,
  rooms,
  withScope,
}: Readonly<{
  plan?: MembershipPlan;
  branches?: readonly { id: string; nombre: string }[];
  rooms?: readonly { id: string; nombre: string }[];
  withScope: boolean;
}>) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Tipo">
          <Select defaultValue={plan?.tipo ?? 'MONTHLY'} name="tipo">
            {planTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Duración en días">
          <Input
            defaultValue={plan?.duracionDias ?? 30}
            min="1"
            name="duracionDias"
            required
            type="number"
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field hint="Vacío = plan sin precio publicado." label="Precio">
          <Input defaultValue={plan?.precio ?? ''} min="0" name="precio" step="0.01" type="number" />
        </Field>
        <Field label="Moneda">
          <Select defaultValue={plan?.moneda ?? 'CLP'} name="moneda">
            {currencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </Select>
        </Field>
        <Field hint="Menor aparece primero." label="Orden">
          <Input defaultValue={plan?.orden ?? 0} min="0" name="orden" type="number" />
        </Field>
      </div>

      <Field hint="Uno por línea o separados por comas." label="Beneficios">
        <Textarea defaultValue={plan?.beneficios.join('\n') ?? ''} name="beneficios" rows={3} />
      </Field>

      <Field hint="Ejemplo: 7,3,1,0" label="Días de recordatorio">
        <Input
          defaultValue={(plan?.diasRecordatorio ?? [7, 3, 1, 0]).join(',')}
          name="diasRecordatorio"
        />
      </Field>

      <fieldset className="grid gap-3">
        <legend className="data-label">Disponible para</legend>
        <div className="flex flex-wrap gap-5 text-sm">
          <label className="flex items-center gap-2">
            <input
              className="size-4 accent-[var(--volt)]"
              defaultChecked={plan?.disponibleNuevo ?? true}
              name="disponibleNuevo"
              type="checkbox"
            />
            Alta nueva
          </label>
          <label className="flex items-center gap-2">
            <input
              className="size-4 accent-[var(--volt)]"
              defaultChecked={plan?.disponibleRenovacion ?? true}
              name="disponibleRenovacion"
              type="checkbox"
            />
            Renovación
          </label>
          <label className="flex items-center gap-2">
            <input
              className="size-4 accent-[var(--volt)]"
              defaultChecked={plan?.disponibleExtension ?? true}
              name="disponibleExtension"
              type="checkbox"
            />
            Extensión
          </label>
        </div>
      </fieldset>

      {withScope ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Sede autorizada">
            <Select name="sedeId" required>
              {(branches ?? []).map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sala opcional">
            <Select name="salaId">
              <option value="">Toda la sede</option>
              {(rooms ?? []).map((room) => (
                <option key={room.id} value={room.id}>
                  {room.nombre}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      ) : null}

      <Field label="Descripción">
        <Textarea defaultValue={plan?.descripcion ?? ''} name="descripcion" />
      </Field>
    </>
  );
}
