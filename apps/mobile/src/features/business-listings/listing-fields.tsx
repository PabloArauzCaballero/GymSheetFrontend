import { LISTING_SHAPE, type ListingForm, type ListingFormErrors } from '@gymsheet/domain';
import type { CategoryTreeNode } from '@gymsheet/schemas';
import { View } from 'react-native';
import { Select } from '@/components/select';
import { Input } from '@/components/ui';
import { spacing } from '@/theme';

type Props = {
  form: ListingForm;
  errors: ListingFormErrors;
  onChange: (patch: Partial<ListingForm>) => void;
  withPrice?: boolean;
  disabled?: boolean;
};

/** Step 3, «Nombre y precio»: four fields at most; the price in Bs with a decimal keyboard. */
export function ListingTextFields({ form, errors, onChange, withPrice = true, disabled = false }: Props) {
  return (
    <View style={{ gap: spacing.md }}>
      <Input editable={!disabled} error={errors.name} label="Nombre" maxLength={180} onChangeText={(name) => onChange({ name })} placeholder="Mensual libre" value={form.name} />
      {withPrice ? (
        <Input error={errors.price} keyboardType="decimal-pad" label="Precio en bolivianos (Bs)" onChangeText={(price) => onChange({ price })} placeholder="250" value={form.price} />
      ) : null}
      <Input editable={!disabled} error={errors.description} label="Qué incluye" maxLength={5000} multiline onChangeText={(description) => onChange({ description })} value={form.description} />
      <Input editable={!disabled} label="Beneficios, uno por línea (opcional)" multiline onChangeText={(benefits) => onChange({ benefits })} value={form.benefits} />
    </View>
  );
}

function categoryOptions(nodes: readonly CategoryTreeNode[], depth = 0): Array<{ value: string; label: string }> {
  return nodes.flatMap((node) => [{ value: node.id, label: `${depth > 0 ? '· ' : ''}${node.name}` }, ...categoryOptions(node.children, depth + 1)]);
}

/** Step 4, «Detalle»: only what the kind takes. Numeric keyboards. */
export function ListingDetailFields({
  form,
  errors,
  onChange,
  categories,
  withStock = true,
  disabled = false,
}: Omit<Props, 'withPrice'> & { categories: readonly CategoryTreeNode[]; withStock?: boolean }) {
  if (!form.offerKind) return null;
  const shape = LISTING_SHAPE[form.offerKind];
  return (
    <View style={{ gap: spacing.md }}>
      {shape.sessions !== 'FORBIDDEN' ? (
        <Input editable={!disabled} error={errors.sessionsCount} keyboardType="number-pad" label="Sesiones que incluye" onChangeText={(sessionsCount) => onChange({ sessionsCount })} placeholder="10" value={form.sessionsCount} />
      ) : null}
      {shape.validity !== 'FORBIDDEN' ? (
        <Input
          editable={!disabled}
          error={errors.validityDays}
          keyboardType="number-pad"
          label={shape.validity === 'OPTIONAL' ? 'Vence a los (días, opcional)' : 'Duración (días)'}
          onChangeText={(validityDays) => onChange({ validityDays })}
          placeholder="30"
          value={form.validityDays}
        />
      ) : null}
      {shape.product && withStock ? (
        <Input error={errors.stockQuantity} keyboardType="number-pad" label="Unidades en stock (opcional)" onChangeText={(stockQuantity) => onChange({ stockQuantity })} placeholder="20" value={form.stockQuantity} />
      ) : null}
      {shape.product && !disabled ? (
        <Select
          label="Categoría (opcional)"
          onChange={(productCategoryId) => onChange({ productCategoryId })}
          options={[{ value: '', label: 'Sin categoría' }, ...categoryOptions(categories)]}
          value={form.productCategoryId}
        />
      ) : null}
    </View>
  );
}
