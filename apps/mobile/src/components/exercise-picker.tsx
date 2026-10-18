import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { ExerciseSearch } from '@/features/exercise-search/exercise-search';
import { colors, fontSizes, iconSizes, minTouchTarget, overlay, radii, spacing } from '@/theme';

/** How much of the screen the sheet claims: enough rows to scan, still clearly a sheet. */
const SHEET_HEIGHT = '90%';

/**
 * Catalogue search in a bottom sheet, used to add an exercise to a session in
 * progress. It only picks: the caller owns the mutation and reports it back
 * through `pending`, so the sheet can stay open (and inert) while the row is
 * being saved instead of closing on an optimistic guess.
 */
export function ExercisePicker({
  visible,
  onClose,
  onSelect,
  pending,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (exerciseId: string) => void;
  pending: boolean;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Cuál se está guardando: su fila gira y las demás no admiten otro toque.
  const [pendingId, setPendingId] = useState<string | null>(null);
  useEffect(() => {
    if (!pending) setPendingId(null);
  }, [pending]);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: overlay.scrim }}>
        {/* The strip above the sheet dismisses it, the way a native sheet does.
            Hidden from the accessibility tree: the close button is the labelled
            way out, and a full-screen target would swallow every swipe. */}
        <Pressable accessible={false} onPress={onClose} style={{ flex: 1 }} />

        <View
          accessibilityViewIsModal
          style={{
            height: SHEET_HEIGHT,
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            backgroundColor: colors.surfaceLow,
            paddingTop: spacing.md,
            gap: spacing.sm,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg }}>
            <Text
              accessibilityRole="header"
              style={{
                flex: 1,
                color: colors.text,
                fontSize: fontSizes.lg,
                fontWeight: '700',
                letterSpacing: -0.5,
              }}
            >
              Añadir ejercicio
            </Text>
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
              <Ionicons
                accessibilityElementsHidden
                color={colors.text}
                importantForAccessibility="no-hide-descendants"
                name="close"
                size={iconSizes.md}
              />
            </Pressable>
          </View>

          {/* El buscador compartido: se monta al abrir, así cada apertura parte
              de cero (una búsqueda del ejercicio anterior nunca es lo que se
              busca ahora) y el teclado sale con el campo ya enfocado. */}
          {visible ? (
            <ExerciseSearch
              emptyAction={
                // Una lista vacía sin salida deja la sesión a medias: el
                // ejercicio que falta se puede crear sin abandonarla.
                <Button
                  icon="add"
                  label="Crear ejercicio"
                  onPress={() => {
                    onClose();
                    router.push('/ejercicio-nuevo');
                  }}
                  size="sm"
                  variant="ghost"
                />
              }
              mode={{
                kind: 'select',
                pendingId: pending ? (pendingId ?? 'guardando') : null,
                onSelect: (exerciseId) => {
                  setPendingId(exerciseId);
                  onSelect(exerciseId);
                },
              }}
              padding={{
                top: 0,
                // Above the home indicator: the last row must stay tappable.
                bottom: insets.bottom + spacing.lg,
                left: spacing.lg,
                right: spacing.lg,
              }}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
