import { Text, View } from 'react-native';
import { type CatalogTab, type MineChip } from '@gymsheet/hooks';
import { SegmentLabel, SegmentedPill } from '@/components/motion';
import { FilterChip } from '@/components/filter-chip';
import { colors, fontSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

/**
 * Orden y nombres del móvil (C8.3.4): lo propio primero, luego lo que REPP
 * recomienda y al final lo público. Los ámbitos son los de `CATALOG_TABS`.
 */
const TABS: readonly { scope: CatalogTab; label: string }[] = [
  { scope: 'mine', label: 'Mías' },
  { scope: 'official', label: 'Recomendadas' },
  { scope: 'public', label: 'Públicas' },
];

/**
 * Pestañas como control segmentado accesible. La pastilla es neutra: elegir
 * una pestaña es seleccionar, no la acción principal (el acento no va aquí).
 */
export function CatalogTabBar({
  value,
  onChange,
}: {
  value: CatalogTab;
  onChange: (next: CatalogTab) => void;
}) {
  return (
    <View accessibilityRole="tablist">
      <SegmentedPill
        fill
        itemStyle={{
          minHeight: minTouchTarget,
          flexGrow: 1,
          flexBasis: 0,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.sm,
        }}
        onChange={onChange}
        options={TABS.map((tab) => ({
          value: tab.scope,
          accessibilityLabel: `Pestaña ${tab.label}`,
        }))}
        pillColor={colors.surfaceHighest}
        renderItem={(option, active) => (
          <SegmentLabel
            active={active}
            activeColor={colors.text}
            inactiveColor={colors.textMuted}
            label={TABS.find((tab) => tab.scope === option.value)?.label ?? ''}
            style={{ fontSize: fontSizes.sm, fontWeight: semibold }}
          />
        )}
        style={{
          alignSelf: 'stretch',
          borderRadius: radii.full,
          backgroundColor: colors.surfaceLow,
          padding: spacing.xs,
        }}
        value={value}
      />
    </View>
  );
}

/** Chips de «Mías»: Creadas por mí · Compartidas conmigo (n). */
export function MineChips({
  value,
  onChange,
  pendingInvitations,
}: {
  value: MineChip;
  onChange: (next: MineChip) => void;
  pendingInvitations: number;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      <FilterChip
        label="Creadas por mí"
        onPress={() => onChange('created')}
        selected={value === 'created'}
        testID="chip-created"
      />
      <FilterChip
        accessibilityLabel={
          pendingInvitations > 0
            ? `Compartidas conmigo, ${pendingInvitations} invitaciones pendientes`
            : 'Compartidas conmigo'
        }
        label={pendingInvitations > 0 ? `Compartidas conmigo (${pendingInvitations})` : 'Compartidas conmigo'}
        onPress={() => onChange('shared')}
        selected={value === 'shared'}
        testID="chip-shared"
      />
    </View>
  );
}

/** «Mostrando 12 rutinas» con el filtro activo, para que el contador sea verificable. */
export function ResultCount({ shown, hasMore }: { shown: number; hasMore: boolean }) {
  return (
    <Text
      accessibilityLiveRegion="polite"
      style={{ color: colors.textMuted, fontSize: fontSizes.sm }}
      testID="result-count"
    >
      {shown === 1 ? '1 rutina' : `${shown} rutinas`}
      {hasMore ? ' · hay más' : ''}
    </Text>
  );
}
