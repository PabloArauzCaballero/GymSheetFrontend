import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { PressableScale } from '@/components/motion';
import { colors, comfortableTouchTarget, fontSizes, iconSizes, radii, spacing } from '@/theme';

/** Alto del buscador; el botón de filtros de al lado mide lo mismo. */
export const SEARCH_HEIGHT = comfortableTouchTarget;

/**
 * Buscador del catálogo: un hueco relleno, sin contorno, con la lupa dentro y
 * una ✕ para borrar cuando hay texto. Va a la misma altura, radio y tono que el
 * botón de filtros que tiene al lado (antes eran un campo con borde de
 * formulario y un botón sin él, de alturas distintas). Con foco, el filo se
 * enciende en el acento.
 */
export function SearchField({ value, onChangeText }: { value: string; onChangeText: (text: string) => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        height: SEARCH_HEIGHT,
        paddingHorizontal: spacing.md,
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: focused ? colors.volt : colors.surfaceHigh,
        backgroundColor: colors.surfaceHigh,
      }}
    >
      <Ionicons
        accessibilityElementsHidden
        color={focused ? colors.text : colors.textMuted}
        importantForAccessibility="no-hide-descendants"
        name="search"
        size={iconSizes.md}
      />
      <TextInput
        accessibilityLabel="Buscar rutinas"
        autoCapitalize="none"
        autoCorrect={false}
        cursorColor={colors.volt}
        keyboardAppearance="dark"
        onBlur={() => setFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        placeholder="Buscar rutina…"
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        selectionColor={colors.volt}
        style={{ flex: 1, color: colors.text, fontSize: fontSizes.md, padding: 0 }}
        testID="routine-search"
        value={value}
      />
      {value.length > 0 ? (
        <PressableScale
          accessibilityLabel="Borrar la búsqueda"
          haptic="none"
          hitSlop={12}
          onPress={() => onChangeText('')}
          scaleTo={0.9}
          testID="clear-search"
        >
          <Ionicons color={colors.textMuted} name="close-circle" size={iconSizes.md} />
        </PressableScale>
      ) : null}
    </View>
  );
}
