import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { PublicBranchSummary } from '@gymsheet/schemas';
import { trainingGoals } from '@gymsheet/types';
import { Section } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { Button } from '@/components/ui';
import { TRAINING_GOAL_LABEL } from '@/lib/social-labels';
import { alpha, colors, fontSizes, iconSizes, ink, minTouchTarget, overlay, radii, spacing } from '@/theme';
import { FilterChip } from './filter-chip';

const GOAL_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  HIPERTROFIA: 'barbell-outline',
  FUERZA: 'flash-outline',
  RESISTENCIA: 'infinite-outline',
  PERDIDA_GRASA: 'flame-outline',
  SALUD_GENERAL: 'heart-outline',
  RENDIMIENTO_DEPORTIVO: 'trophy-outline',
  REHABILITACION: 'medkit-outline',
};

/**
 * Session filters for the deck: goal and branch. Who you want to meet (gender
 * included) lives in the saved discovery preferences, never here.
 */
export function SearchPreferencesSheet({
  visible,
  onClose,
  onOpenBlocked,
  objetivos,
  setObjetivos,
  sucursalId,
  setSucursalId,
  branches,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenBlocked: () => void;
  objetivos: readonly string[];
  setObjetivos: (value: string[]) => void;
  sucursalId: string | null;
  setSucursalId: (value: string | null) => void;
  branches: PublicBranchSummary[];
}) {
  const insets = useSafeAreaInsets();
  const hasActiveFilters = objetivos.length > 0 || sucursalId !== null;
  const toggleGoal = (goal: string) =>
    setObjetivos(objetivos.includes(goal) ? objetivos.filter((g) => g !== goal) : [...objetivos, goal]);

  return (
    <Modal animationType="slide" onRequestClose={onClose} statusBarTranslucent transparent visible={visible}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: overlay.scrim }}>
        <Pressable accessible={false} onPress={onClose} style={{ flex: 1 }} />
        <View
          accessibilityViewIsModal
          style={{
            maxHeight: '85%',
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            backgroundColor: colors.surfaceLow,
            paddingTop: spacing.sm,
            paddingHorizontal: spacing.lg,
            paddingBottom: Math.max(insets.bottom, spacing.md),
            gap: spacing.lg,
          }}
        >
          <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: alpha(ink.white, 0.25), alignSelf: 'center', marginBottom: 4 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text accessibilityRole="header" style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: '700', letterSpacing: -0.5 }}>
                Preferencias de búsqueda
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                {objetivos.length > 0
                  ? `${objetivos.length} ${objetivos.length === 1 ? 'objetivo seleccionado' : 'objetivos seleccionados'}`
                  : 'Explora deportistas con cualquier objetivo'}
              </Text>
            </View>
            {hasActiveFilters ? (
              <PressableScale
                onPress={() => {
                  setObjetivos([]);
                  setSucursalId(null);
                }}
                style={{ paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radii.full, backgroundColor: alpha(colors.volt, 0.12) }}
              >
                <Text style={{ color: colors.accentInk, fontSize: fontSizes.xs, fontWeight: '700' }}>Restablecer</Text>
              </PressableScale>
            ) : null}
            <Pressable
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => ({
                width: minTouchTarget,
                height: minTouchTarget,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radii.full,
                backgroundColor: colors.surfaceHigh,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Ionicons color={colors.text} name="close" size={iconSizes.md} />
            </Pressable>
          </View>

          <Section icon="options-outline" title="Objetivo de entrenamiento">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              <FilterChip active={objetivos.length === 0} icon="apps-outline" label="Todos" onPress={() => setObjetivos([])} />
              {trainingGoals.map((goal) => (
                <FilterChip
                  active={objetivos.includes(goal)}
                  icon={GOAL_ICON[goal] ?? 'trophy-outline'}
                  key={goal}
                  label={TRAINING_GOAL_LABEL[goal] ?? goal}
                  onPress={() => toggleGoal(goal)}
                />
              ))}
            </View>
          </Section>

          {branches.length > 1 ? (
            <Section icon="business-outline" title="Sede del gimnasio">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                <FilterChip active={!sucursalId} icon="apps-outline" label="Todas" onPress={() => setSucursalId(null)} />
                {branches.map((branch) => (
                  <FilterChip
                    active={sucursalId === branch.id}
                    icon="business-outline"
                    key={branch.id}
                    label={branch.nombre}
                    onPress={() => setSucursalId(sucursalId === branch.id ? null : branch.id)}
                  />
                ))}
              </View>
            </Section>
          ) : null}

          <View style={{ gap: spacing.sm, paddingTop: spacing.xs }}>
            <Button icon="shield-outline" label="Personas bloqueadas" onPress={onOpenBlocked} variant="ghost" />
            <Button icon="checkmark" label="Aplicar filtros" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
