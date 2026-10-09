import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import {
  WEEKDAY_NAMES,
  isoWeekday,
  multiplierLabel,
  nextSession,
  weekLabel,
  type Weekday,
} from '@gymsheet/hooks';
import type { Program } from '@gymsheet/schemas';
import { routineService } from '@/api/services';
import { Badge } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { Button } from '@/components/ui';
import { MODE_BADGE } from '@/features/programs/labels';
import { colors, fontSizes, iconSizes, radii, semibold, spacing } from '@/theme';

/** El programa ya pasó su fecha fin: toca decidir qué sigue (RF-19). */
export function isProgramOver(program: Program, today = new Date()): boolean {
  const end = new Date(`${program.fechaFinPrevista}T23:59:59`);
  return today.getTime() > end.getTime();
}

/**
 * Tarjeta del programa de pesas en Rutinas (RF-14): «Empuje 4 días · Semana 3 de 12 ·
 * x1,4 · Hoy: Pierna → Entrenar». Al terminar la duración, ofrece el cierre.
 */
export function StrengthProgramCard({ program }: { program: Program }) {
  const router = useRouter();
  const routine = useQuery({
    queryKey: ['routine', program.rutinaId],
    queryFn: () => routineService.get(program.rutinaId ?? ''),
    enabled: Boolean(program.rutinaId),
  });
  const next = routine.data ? nextSession(routine.data, isoWeekday(new Date())) : null;
  const over = isProgramOver(program);
  const nextText = next
    ? `${next.esHoy ? 'Hoy' : WEEKDAY_NAMES[next.dia as Weekday]}: ${next.nombre ?? 'Entrenamiento'}`
    : 'Entrena cuando quieras';

  return (
    <PressableScale
      accessibilityLabel={`Programa de pesas. ${program.rutinaNombre ?? ''}. ${weekLabel(program)}. ${over ? 'Terminó' : nextText}`}
      haptic="selection"
      onPress={() =>
        router.push({ pathname: over ? '/routines/program/close/[id]' : '/routines/program/[id]', params: { id: program.id } })
      }
      scaleTo={0.985}
      style={{
        gap: spacing.sm,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: `${colors.volt}66`,
        backgroundColor: colors.surfaceLow,
        padding: spacing.md,
      }}
      testID="program-card-strength"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Ionicons color={colors.volt} name="barbell-outline" size={iconSizes.md} />
        <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
          {program.rutinaNombre ?? 'Programa de pesas'}
        </Text>
        <Badge label={MODE_BADGE[program.modo] ?? program.modo} tone="info" />
      </View>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }} testID="program-week">
        {weekLabel(program)}
        {program.esDescarga ? ' · Descarga' : ''}
      </Text>
      <Text style={{ color: colors.text, fontSize: fontSizes.sm }}>
        {over ? 'Terminaste el programa. ¿Qué sigue?' : nextText}
        {!over && program.multiplicador > 1 ? ` · bono ${multiplierLabel(program.multiplicador)}` : ''}
      </Text>
      {over ? <Button label="Decidir qué sigue" onPress={() => router.push({ pathname: '/routines/program/close/[id]', params: { id: program.id } })} /> : null}
    </PressableScale>
  );
}
