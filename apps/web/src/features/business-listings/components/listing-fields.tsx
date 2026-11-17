'use client';

import { LISTING_SHAPE, type ListingForm, type ListingFormErrors } from '@gymsheet/domain';
import type { CategoryTreeNode } from '@/shared/api/schemas';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';

type FieldsProps = Readonly<{
  form: ListingForm;
  errors: ListingFormErrors;
  onChange: (patch: Partial<ListingForm>) => void;
  /** Editing an existing listing: price and stock have their own form there. */
  withPrice?: boolean;
  disabled?: boolean;
}>;

/** Step 3, «Nombre y precio»: four fields at most. Price in bolivianos with a decimal keyboard. */
export function ListingTextFields({ form, errors, onChange, withPrice = true, disabled = false }: FieldsProps) {
  return (
    <div className="grid gap-4">
      <Field error={errors.name} label="Nombre">
        <Input autoComplete="off" disabled={disabled} maxLength={180} onChange={(event) => onChange({ name: event.target.value })} placeholder="Mensual libre…" value={form.name} />
      </Field>
      {withPrice ? (
        <Field error={errors.price} hint="Siempre en bolivianos (Bs)." label="Precio">
          <Input autoComplete="off" inputMode="decimal" onChange={(event) => onChange({ price: event.target.value })} placeholder="250" value={form.price} />
        </Field>
      ) : null}
      <Field error={errors.description} label="Qué incluye">
        <Textarea disabled={disabled} maxLength={5000} onChange={(event) => onChange({ description: event.target.value })} rows={4} value={form.description} />
      </Field>
      <Field hint="Uno por línea, por ejemplo «Toalla» o «Casillero»." label="Beneficios (opcional)">
        <Textarea disabled={disabled} onChange={(event) => onChange({ benefits: event.target.value })} rows={3} value={form.benefits} />
      </Field>
    </div>
  );
}

function categoryOptions(nodes: readonly CategoryTreeNode[], depth = 0): Array<{ id: string; label: string }> {
  return nodes.flatMap((node) => [{ id: node.id, label: `${'  '.repeat(depth)}${node.name}` }, ...categoryOptions(node.children, depth + 1)]);
}

/** Step 4, «Detalle»: only what the kind takes (duration, sessions, or stock and category). */
export function ListingDetailFields({
  form,
  errors,
  onChange,
  categories,
  withStock = true,
  disabled = false,
}: Readonly<Omit<FieldsProps, 'withPrice'> & { categories: readonly CategoryTreeNode[]; withStock?: boolean }>) {
  if (!form.offerKind) return null;
  const shape = LISTING_SHAPE[form.offerKind];
  return (
    <div className="grid gap-4">
      {shape.sessions !== 'FORBIDDEN' ? (
        <Field error={errors.sessionsCount} label="Sesiones que incluye">
          <Input autoComplete="off" disabled={disabled} inputMode="numeric" onChange={(event) => onChange({ sessionsCount: event.target.value })} placeholder="10" value={form.sessionsCount} />
        </Field>
      ) : null}
      {shape.validity !== 'FORBIDDEN' ? (
        <Field
          error={errors.validityDays}
          hint={shape.validity === 'OPTIONAL' ? 'Opcional: en cuántos días vence el paquete.' : undefined}
          label={shape.validity === 'OPTIONAL' ? 'Vence a los (días)' : 'Duración (días)'}
        >
          <Input autoComplete="off" disabled={disabled} inputMode="numeric" onChange={(event) => onChange({ validityDays: event.target.value })} placeholder="30" value={form.validityDays} />
        </Field>
      ) : null}
      {shape.product && withStock ? (
        <Field error={errors.stockQuantity} hint="Déjalo vacío si no llevas la cuenta." label="Unidades en stock (opcional)">
          <Input autoComplete="off" inputMode="numeric" onChange={(event) => onChange({ stockQuantity: event.target.value })} placeholder="20" value={form.stockQuantity} />
        </Field>
      ) : null}
      {shape.product ? (
        <Field label="Categoría (opcional)">
          <Select disabled={disabled} onChange={(event) => onChange({ productCategoryId: event.target.value })} value={form.productCategoryId}>
            <option value="">Sin categoría</option>
            {categoryOptions(categories).map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
    </div>
  );
}
