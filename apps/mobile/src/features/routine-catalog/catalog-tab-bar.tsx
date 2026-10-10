import { Text, View } from 'react-native';
import { CATALOG_TABS, type CatalogTab, type MineChip } from '@gymsheet/hooks';
import { SegmentLabel, SegmentedPill } from '@/components/motion';
import { ChoiceChip } from '@/components/wizard/choice-chip';
import { accentContrast, colors, fontSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

/** Pestañas Públicas · REPP · Mías, como control segmentado accesible. */
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
        itemStyle={{
          minHeight: minTouchTarget,
          minWidth: 96,
          flexGrow: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.md,
        }}
        onChange={onChange}
        options={CATALOG_TABS.map((tab) => ({
          value: tab.scope,
          accessibilityLabel: `Pestaña ${tab.label}`,
        }))}
        pillColor={colors.volt}
        renderItem={(option, active) => (
          <SegmentLabel
            active={active}
            activeColor={accentContrast()}
            inactiveColor={colors.textMuted}
            label={CATALOG_TABS.find((tab) => tab.scope === option.value)?.label ?? ''}
            style={{ fontSize: fontSizes.sm, fontWeight: semibold }}
          />
        )}
        style={{
          alignSelf: 'stretch',
          borderRadius: radii.full,
          backgroundColor: colors.surfaceLow,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
          padding: 4,
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
      <ChoiceChip
        label="Creadas por mí"
        onSelect={() => onChange('created')}
        selected={value === 'created'}
        testID="chip-created"
      />
      <ChoiceChip
        accessibilityLabel={
          pendingInvitations > 0
            ? `Compartidas conmigo, ${pendingInvitations} invitaciones pendientes`
            : 'Compartidas conmigo'
        }
        label={pendingInvitations > 0 ? `Compartidas conmigo (${pendingInvitations})` : 'Compartidas conmigo'}
        onSelect={() => onChange('shared')}
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
