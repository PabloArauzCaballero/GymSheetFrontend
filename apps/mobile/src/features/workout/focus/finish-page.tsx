import { Ionicons } from '@expo/vector-icons';
import { ScrollView, View } from 'react-native';
import { CountUpText } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, fontFamilies, fontSizes, gutter, iconSizes, radii, spacing, tabularNums } from '@/theme';

function Stat({ value, label, suffix }: { value: number; label: string; suffix?: string }) {
  return (
    <View style={{ flex: 1, gap: spacing.xxs }}>
      <CountUpText
        style={[{ color: colors.text, fontFamily: fontFamilies.display, fontSize: fontSizes.xl }, tabularNums]}
        suffix={suffix}
        value={value}
      />
      <Text tone="muted" variant="footnote">
        {label}
      </Text>
    </View>
  );
}

/**
 * La última página: el cierre. Cuánto se hizo y, si quedó algo, qué; el botón
 * fijo de abajo pasa a ser «Finalizar sesión». Deslizar hasta aquí es la
 * forma natural de terminar, sin buscar un botón al fondo de una lista.
 */
export function FinishPage({
  width,
  bottomSpace,
  complete,
  exercisesDone,
  exercisesTotal,
  sets,
  volumeKg,
  minutes,
  pending,
}: {
  width: number;
  bottomSpace: number;
  complete: boolean;
  exercisesDone: number;
  exercisesTotal: number;
  sets: number;
  volumeKg: number;
  minutes: number;
  /** Lo que queda por hacer, en claro: «Remo con barra · 2 series». */
  pending: readonly string[];
}) {
  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: spacing.xl, paddingBottom: bottomSpace, gap: spacing.xl }}
      showsVerticalScrollIndicator={false}
      style={{ width }}
      testID="workout-finish-page"
    >
      <View style={{ gap: spacing.sm }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radii.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceHighest,
          }}
        >
          <Ionicons color={colors.text} name={complete ? 'trophy-outline' : 'flag-outline'} size={iconSizes.lg} />
        </View>
        <Text accessibilityRole="header" variant="display">
          {complete ? 'Sesión completa' : sets > 0 ? '¿Lo dejamos aquí?' : 'Aún no has registrado nada'}
        </Text>
        <Text tone="secondary" variant="body">
          {complete
            ? 'Hiciste todo lo que pedía el día. Finaliza para guardarla y ver tu progreso.'
            : sets > 0
              ? 'Puedes finalizar ahora y se guarda lo que llevas, o volver atrás y seguir.'
              : 'Desliza hacia atrás para empezar con el primer ejercicio.'}
        </Text>
      </View>

      <View style={{ gap: spacing.lg, paddingVertical: spacing.lg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border }}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Stat label={`de ${exercisesTotal} ejercicios`} value={exercisesDone} />
          <Stat label={sets === 1 ? 'serie' : 'series'} value={sets} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Stat label="kg movidos" value={volumeKg} />
          <Stat label="minutos" value={minutes} />
        </View>
      </View>

      {pending.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text strong variant="headline">
            Te queda
          </Text>
          {pending.map((line) => (
            <Text key={line} tabular tone="secondary" variant="subhead">
              {line}
            </Text>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
