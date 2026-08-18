import { useEffect, useRef, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Modal, Pressable, Text, View, findNodeHandle } from 'react-native';
import { confirmStore, type ActiveConfirmation } from '@gymsheet/notifications';
import { Button, type ButtonVariant } from '@/components/ui';
import { colors, fontSizes, radii, spacing, tones } from '@/theme';

const SEVERITY_TONE: Record<ActiveConfirmation['severity'], { border: string; text: string }> = {
  danger: tones.dark.danger,
  warning: tones.dark.warning,
  info: tones.dark.info,
};

/**
 * Half the row each, with tighter side padding than a standalone button: verbs
 * like «Cerrar sesión» or «Inactivar equipo» wrapped onto two lines otherwise.
 */
const BUTTON_STYLE = { flex: 1, paddingHorizontal: spacing.sm } as const;

const CONFIRM_VARIANT: Record<ActiveConfirmation['severity'], ButtonVariant> = {
  danger: 'danger',
  warning: 'primary',
  info: 'primary',
};

/**
 * The single confirmation dialog for the whole app, mounted once by
 * NotificationRoot. Native `Modal` supplies the OS-level modality (it takes
 * over the screen and the Android back button); we add the accessibility
 * focus move and the safe-action bias that a destructive prompt needs.
 *
 * Feature code never renders it — it calls `confirm()` / `confirmDelete()` and
 * awaits the result.
 */
export function ConfirmRoot() {
  const active = useSyncExternalStore(
    confirmStore.subscribe,
    confirmStore.getSnapshot,
    confirmStore.getServerSnapshot,
  );
  const cardRef = useRef<View>(null);

  // VoiceOver/TalkBack land on the prompt instead of staying behind it.
  useEffect(() => {
    if (!active) return;
    const handle = findNodeHandle(cardRef.current);
    if (handle !== null) AccessibilityInfo.setAccessibilityFocus(handle);
  }, [active]);

  const dismiss = () => {
    if (active?.dismissible) confirmStore.resolveActive('dismiss');
  };

  const tone = active ? SEVERITY_TONE[active.severity] : SEVERITY_TONE.info;

  return (
    <Modal
      animationType="fade"
      onRequestClose={dismiss}
      statusBarTranslucent
      transparent
      visible={active !== null}
    >
      {active ? (
        <Pressable
          accessibilityLabel="Cerrar"
          accessible={false}
          onPress={dismiss}
          style={{
            flex: 1,
            justifyContent: 'center',
            padding: spacing.lg,
            backgroundColor: 'rgba(0, 0, 0, 0.72)',
          }}
        >
          {/* Swallows taps so a press inside the card never dismisses it. */}
          <Pressable accessible={false} onPress={() => {}}>
            <View
              accessibilityViewIsModal
              ref={cardRef}
              style={{
                gap: spacing.sm,
                borderRadius: radii.xl,
                borderWidth: 1,
                borderLeftWidth: 3,
                borderColor: colors.border,
                borderLeftColor: tone.border,
                backgroundColor: colors.surfaceLowest,
                padding: spacing.lg,
              }}
            >
              <Text
                accessibilityRole="header"
                style={{ color: tone.text, fontSize: fontSizes.lg, fontWeight: '700' }}
              >
                {active.title}
              </Text>
              <Text style={{ color: colors.text, fontSize: fontSizes.sm, lineHeight: 22 }}>
                {active.message}
              </Text>
              {active.description ? (
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 22 }}>
                  {active.description}
                </Text>
              ) : null}

              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                {/* Safe action first: on a destructive prompt it is what the
                    screen reader reaches first and the thumb reaches by habit. */}
                <Button
                  label={active.cancelLabel}
                  onPress={() => confirmStore.resolveActive('cancel')}
                  style={BUTTON_STYLE}
                  variant="ghost"
                />
                <Button
                  label={active.confirmLabel}
                  onPress={() => confirmStore.resolveActive('confirm')}
                  style={BUTTON_STYLE}
                  variant={CONFIRM_VARIANT[active.severity]}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      ) : null}
    </Modal>
  );
}
