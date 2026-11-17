import { affiliationCopy, ciDigitsOf, joinGymErrors, subscriptionCopy, type JoinGymForm } from '@gymsheet/domain';
import type { PublicLocation } from '@gymsheet/schemas';
import { View } from 'react-native';
import { RowsSkeleton } from '@/components/feedback';
import { Text } from '@/components/text';
import { Input } from '@/components/ui';
import { ChoiceCard } from '@/features/business/type-cards';
import { spacing } from '@/theme';

/**
 * Step 2 of the checkout for a gym membership (plan §4.3): the sede and the
 * last 3 CI digits on a numeric keyboard, the same fields as «Hacerme socio».
 */
export function SocioFields({ form, locations, tried, onChange }: { form: JoinGymForm; locations: PublicLocation[] | null; tried: boolean; onChange: (patch: Partial<JoinGymForm>) => void }) {
  const errors = tried && locations ? joinGymErrors(form, locations) : {};
  return (
    <View style={{ gap: spacing.md }} testID="checkout-socio-step">
      <View style={{ gap: spacing.xxs }}>
        <Text accessibilityRole="header" variant="headline">{subscriptionCopy.socioTitle}</Text>
        <Text tone="secondary" variant="subhead">{subscriptionCopy.socioBody}</Text>
      </View>
      {locations === null ? (
        <RowsSkeleton rows={1} />
      ) : (
        <View accessibilityRole="radiogroup" style={{ gap: spacing.sm }}>
          <Text strong variant="subhead">Tu sede</Text>
          {locations.map((location) => (
            <ChoiceCard
              description={[location.address, location.city].filter(Boolean).join(', ') || 'Sede del gimnasio'}
              key={location.id}
              onPress={() => onChange({ locationId: location.id })}
              selected={form.locationId === location.id}
              title={location.name}
            />
          ))}
          {errors.locationId ? <Text accessibilityRole="alert" tone="danger" variant="footnote">{errors.locationId}</Text> : null}
        </View>
      )}
      <Input
        autoComplete="off"
        error={errors.ciLast3}
        keyboardType="number-pad"
        label={affiliationCopy.ciLabel}
        maxLength={3}
        onChangeText={(text) => onChange({ ciLast3: ciDigitsOf(text) })}
        placeholder="123"
        testID="checkout-ci"
        value={form.ciLast3}
      />
      <Text tone="secondary" variant="footnote">{affiliationCopy.ciHint}</Text>
    </View>
  );
}
