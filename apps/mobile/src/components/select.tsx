import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  colors,
  fontSizes,
  iconSizes,
  minTouchTarget,
  radii,
  semibold,
  spacing,
} from '@/theme';

export type SelectOption<T extends string> = { value: T; label: string };

/**
 * El velo tras la hoja. Literal y no un token porque la paleta compartida no
 * declara ninguno: es opacidad sobre lo que haya debajo, no un color de marca.
 */
const SCRIM = 'rgba(0, 0, 0, 0.62)';

/**
 * Selector de un valor entre varios cerrados.
 *
 * Es el equivalente móvil del `<select>` de la web, y existe por eso: el alta
 * preguntaba el género con una fila de chips en el teléfono y con un desplegable
 * en el navegador. Dos gramáticas distintas para la misma pregunta —los chips
 * además sugieren que se puede elegir más de uno— y ninguna forma de añadir una
 * cuarta opción sin que la fila se parta en el móvil.
 *
 * Lo que se pulsa es un campo idéntico a los de texto que tiene al lado: misma
 * altura, mismo borde, mismo relleno. Lo que abre es una hoja inferior, que es
 * como se elige en esta plataforma — un desplegable anclado al campo deja la
 * lista bajo el pulgar en unos teléfonos y fuera de alcance en otros.
 *
 * No usa `Picker` de la comunidad: traería una dependencia nativa entera para
 * pintar una lista de tres filas, y su apariencia la fija cada sistema
 * operativo, que es justo lo que rompe la coherencia con el resto de la app.
 */
export function Select<T extends string>({
  label,
  hint,
  error,
  options,
  value,
  onChange,
  placeholder = 'Selecciona una opción',
}: {
  label: string;
  hint?: string;
  error?: string;
  options: ReadonlyArray<SelectOption<T>>;
  value: T;
  onChange: (next: T) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const selected = options.find((option) => option.value === value);
  const borderColor = error ? colors.danger : open ? colors.volt : colors.border;

  function choose(next: T) {
    onChange(next);
    setOpen(false);
    void Haptics.selectionAsync();
  }

  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{label}</Text>

      <Pressable
        // Se anuncia como botón con su valor actual: sin `accessibilityValue`,
        // VoiceOver leía sólo la etiqueta y no decía qué había elegido.
        accessibilityHint="Abre la lista de opciones"
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityValue={{ text: selected?.label ?? placeholder }}
        onPress={() => setOpen(true)}
        style={{
          minHeight: minTouchTarget,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor,
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            color: selected ? colors.text : colors.textMuted,
            fontSize: fontSizes.md,
            flexShrink: 1,
          }}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons
          accessibilityElementsHidden
          color={colors.textMuted}
          importantForAccessibility="no-hide-descendants"
          name="chevron-down"
          size={iconSizes.md}
        />
      </Pressable>

      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={{ color: colors.danger, fontSize: fontSizes.xs }}
        >
          {error}
        </Text>
      ) : null}
      {!error && hint ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
          {hint}
        </Text>
      ) : null}

      <Modal
        // El velo lo desvanece el propio `Modal`, no Reanimated: una animación
        // de entrada/salida sobre la vista raíz de un `Modal` no está soportada
        // —Reanimated lo avisa por consola y la salida ni siquiera llega a
        // verse, porque la vista se desmonta con el modal—. Lo que sí se anima
        // aquí dentro es la hoja, que no es la raíz.
        animationType="fade"
        // El botón físico de volver de Android cierra la hoja en vez de salir
        // de la pantalla, que es lo que ocurriría sin esto.
        onRequestClose={() => setOpen(false)}
        transparent
        visible={open}
      >
        <View style={{ flex: 1, backgroundColor: SCRIM }}>
          {/* Tocar fuera cierra. Es un `Pressable` que ocupa lo que sobra por
              encima de la hoja, no un gesto global: así la propia hoja no
              hereda el cierre al tocarla. */}
          <Pressable
            accessibilityLabel="Cerrar"
            accessibilityRole="button"
            onPress={() => setOpen(false)}
            style={{ flex: 1 }}
          />
          <Animated.View
            entering={FadeInDown.duration(240)}
            style={{
              backgroundColor: colors.surfaceLow,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              borderTopWidth: 1,
              borderColor: colors.borderSubtle,
              paddingTop: spacing.sm,
              paddingBottom: insets.bottom + spacing.md,
            }}
          >
            {/* El tirador. No arrastra nada: dice que esto es una hoja y que se
                cierra hacia abajo, que es la convención que la gente ya trae
                aprendida del sistema. */}
            <View
              style={{
                alignSelf: 'center',
                width: 36,
                height: 4,
                borderRadius: radii.full,
                backgroundColor: colors.surfaceHighest,
                marginBottom: spacing.md,
              }}
            />
            <Text
              style={{
                color: colors.textMuted,
                fontSize: fontSizes.sm,
                fontWeight: semibold,
                paddingHorizontal: spacing.lg,
                paddingBottom: spacing.sm,
              }}
            >
              {label}
            </Text>

            {options.map((option) => {
              const active = option.value === value;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  key={option.value || 'unspecified'}
                  onPress={() => choose(option.value)}
                  style={{
                    minHeight: minTouchTarget + spacing.xs,
                    paddingHorizontal: spacing.lg,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: spacing.sm,
                  }}
                >
                  <Text
                    style={{
                      color: active ? colors.text : colors.textMuted,
                      fontSize: fontSizes.md,
                      fontWeight: active ? semibold : '400',
                    }}
                  >
                    {option.label}
                  </Text>
                  {active ? (
                    <Ionicons color={colors.volt} name="checkmark" size={iconSizes.md} />
                  ) : null}
                </Pressable>
              );
            })}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}
