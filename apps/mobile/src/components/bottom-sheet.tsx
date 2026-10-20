import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '@/components/motion';
import { colors, fontSizes, iconSizes, minTouchTarget, overlay, radii, semibold, spacing } from '@/theme';

/**
 * Hoja inferior para el detalle que no merece una pantalla: la lista de un día,
 * los filtros, la denuncia. Cierra con la X, tocando el velo o con el gesto
 * «atrás» del sistema; el contenido hace scroll cuando no cabe.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  testID,
  onDismissed,
}: {
  visible: boolean;
  onClose: () => void;
  /**
   * Cuando la hoja ya terminó de irse. Lo que se abra después (otra hoja, el
   * selector de fotos, una alerta) va aquí: iOS no presenta nada mientras un
   * `Modal` todavía se está cerrando, y en un iPhone real ese cierre tarda más
   * que cualquier temporizador fijo.
   */
  onDismissed?: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  testID?: string;
}) {
  const insets = useSafeAreaInsets();
  const wasVisible = useRef(visible);
  const onDismissedRef = useRef(onDismissed);
  onDismissedRef.current = onDismissed;
  // `onDismiss` del `Modal` solo existe en iOS; en Android basta con que se cierre.
  useEffect(() => {
    if (Platform.OS !== 'ios' && wasVisible.current && !visible) onDismissedRef.current?.();
    wasVisible.current = visible;
  }, [visible]);
  return (
    <Modal
      animationType="slide"
      onDismiss={Platform.OS === 'ios' ? () => onDismissedRef.current?.() : undefined}
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      {/* Con el teclado abierto la hoja sube con él: el botón de abajo no queda tapado. */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end' }}
        testID={testID}
      >
        <Pressable
          accessibilityLabel="Cerrar"
          onPress={onClose}
          style={{ position: 'absolute', inset: 0, backgroundColor: overlay.scrimSoft }}
        />
        <View
          accessibilityViewIsModal
          style={{
            maxHeight: '88%',
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            paddingBottom: insets.bottom + spacing.md,
          }}
        >
          <ScrollView
            contentContainerStyle={{ gap: spacing.md, padding: spacing.lg }}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text
                  accessibilityRole="header"
                  style={{
                    color: colors.text,
                    fontSize: fontSizes.xl,
                    fontWeight: semibold,
                    letterSpacing: fontSizes.xl * -0.03,
                  }}
                >
                  {title}
                </Text>
                {subtitle ? (
                  <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              <PressableScale
                accessibilityLabel="Cerrar"
                haptic="none"
                hitSlop={8}
                onPress={onClose}
                scaleTo={0.9}
                style={{
                  width: minTouchTarget,
                  height: minTouchTarget,
                  borderRadius: radii.full,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.surfaceHigh,
                }}
              >
                <Ionicons color={colors.text} name="close" size={iconSizes.md} />
              </PressableScale>
            </View>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
