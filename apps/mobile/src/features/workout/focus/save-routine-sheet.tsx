import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { colors, fontSizes, radii, spacing } from '@/theme';

const NAME_MIN = 2;
const NAME_MAX = 160;

/**
 * Al terminar un entreno armado sobre la marcha: «¿La guardo como rutina?».
 * Con el nombre ya puesto, es un toque; «Terminar sin guardar» no pierde nada
 * del entreno, solo se queda sin plantilla.
 */
export function SaveRoutineSheet({
  visible,
  defaultName,
  exercises,
  busy,
  error,
  onSave,
  onSkip,
  onClose,
}: {
  visible: boolean;
  defaultName: string;
  /** Cuántos ejercicios pasarían a la rutina. */
  exercises: number;
  busy: boolean;
  /** Por qué falló el último intento de guardar, o `null`. */
  error: string | null;
  onSave: (name: string) => void;
  onSkip: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(defaultName);
  useEffect(() => {
    if (visible) setName(defaultName);
  }, [visible, defaultName]);
  const valid = name.trim().length >= NAME_MIN;

  return (
    <BottomSheet
      onClose={busy ? () => undefined : onClose}
      subtitle={`${exercises} ${exercises === 1 ? 'ejercicio' : 'ejercicios'}, con las series y cargas de hoy`}
      testID="save-routine-sheet"
      title="¿La guardas como rutina?"
      visible={visible}
    >
      <View style={{ gap: spacing.md }}>
        <TextInput
          accessibilityLabel="Nombre de la rutina"
          editable={!busy}
          maxLength={NAME_MAX}
          onChangeText={setName}
          placeholder="Nombre de la rutina"
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          selectTextOnFocus
          style={{
            minHeight: 52,
            paddingHorizontal: spacing.md,
            borderRadius: radii.lg,
            borderCurve: 'continuous',
            backgroundColor: colors.surfaceSunken,
            color: colors.text,
            fontSize: fontSizes.md,
          }}
          testID="save-routine-name"
          value={name}
        />
        {error ? (
          <Text tone="danger" variant="footnote">
            {error}
          </Text>
        ) : null}
        <Button
          disabled={!valid}
          icon="bookmark"
          label="Guardar y terminar"
          loading={busy}
          onPress={() => onSave(name.trim())}
          size="lg"
          testID="save-routine-confirm"
        />
        <Button disabled={busy} label="Terminar sin guardar rutina" onPress={onSkip} variant="ghost" testID="save-routine-skip" />
      </View>
    </BottomSheet>
  );
}
