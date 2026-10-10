import { Text, View } from 'react-native';
import {
  ORDER_LABELS,
  emptyCatalogFilters,
  type CatalogFilterState,
} from '@gymsheet/hooks';
import { routineCatalogOrders, trainingGoals } from '@gymsheet/types';
import { BottomSheet } from '@/components/bottom-sheet';
import { ChoiceChip } from '@/components/wizard/choice-chip';
import { Button } from '@/components/ui';
import { GOAL_LABEL } from '@/lib/format';
import { colors, fontSizes, semibold, spacing } from '@/theme';

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, fontWeight: semibold }}>
        {title}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>{children}</View>
    </View>
  );
}

/**
 * Filtros de Públicas (RF-01): objetivo, días por semana, «De mi gimnasio» y
 * orden. Se aplican al instante; «Limpiar filtros» los vuelve a su estado inicial.
 */
export function CatalogFiltersSheet({
  visible,
  onClose,
  value,
  onChange,
}: {
  visible: boolean;
  onClose: () => void;
  value: CatalogFilterState;
  onChange: (next: CatalogFilterState) => void;
}) {
  const set = (patch: Partial<CatalogFilterState>) => onChange({ ...value, ...patch });
  return (
    <BottomSheet onClose={onClose} testID="filters-sheet" title="Filtros" visible={visible}>
      <Group title="Objetivo">
        {trainingGoals.map((goal) => (
          <ChoiceChip
            key={goal}
            label={GOAL_LABEL[goal]}
            onSelect={() => set({ objetivo: value.objetivo === goal ? null : goal })}
            selected={value.objetivo === goal}
            testID={`filter-goal-${goal}`}
          />
        ))}
      </Group>
      <Group title="Días por semana">
        {[1, 2, 3, 4, 5, 6, 7].map((days) => (
          <ChoiceChip
            accessibilityLabel={days === 1 ? '1 día por semana' : `${days} días por semana`}
            key={days}
            label={String(days)}
            onSelect={() => set({ diasPorSemana: value.diasPorSemana === days ? null : days })}
            selected={value.diasPorSemana === days}
            testID={`filter-days-${days}`}
          />
        ))}
      </Group>
      <Group title="Origen">
        <ChoiceChip
          label="De mi gimnasio"
          onSelect={() => set({ deMiGimnasio: !value.deMiGimnasio })}
          selected={value.deMiGimnasio}
          testID="filter-gym"
        />
      </Group>
      <Group title="Ordenar por">
        {routineCatalogOrders.map((order) => (
          <ChoiceChip
            key={order}
            label={ORDER_LABELS[order]}
            onSelect={() => set({ orden: order })}
            selected={value.orden === order}
            testID={`filter-order-${order}`}
          />
        ))}
      </Group>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          label="Limpiar filtros"
          onPress={() => onChange({ ...emptyCatalogFilters, q: value.q })}
          style={{ flex: 1 }}
          variant="ghost"
        />
        <Button label="Listo" onPress={onClose} style={{ flex: 1 }} />
      </View>
    </BottomSheet>
  );
}
