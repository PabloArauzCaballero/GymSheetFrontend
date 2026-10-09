import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { WEEKDAY_NAMES, multiplierLabel, targetMinutesForWeek, type Weekday } from '@gymsheet/hooks';
import { cardioModalityLabels, type Program } from '@gymsheet/schemas';
import { programService } from '@/api/services';
import { Badge } from '@/components/layout';
import { Button } from '@/components/ui';
import { colors, fontSizes, iconSizes, radii, semibold, spacing } from '@/theme';

/**
 * Tarjeta del plan de cardio (RF-17): modalidad, minutos que cuentan frente al objetivo de la
 * semana («96 / 90 min») y «Registrar cardio». Si hoy también hay pesas, avisa «Haz primero las
 * pesas».
 */
export function CardioProgramCard({ program, strengthToday }: { program: Program; strengthToday: boolean }) {
  const router = useRouter();
  const plans = useQuery({ queryKey: ['cardio-plans'], queryFn: () => programService.cardioPlans() });
  const progress = useQuery({ queryKey: ['programs', program.id, 'progress'], queryFn: () => programService.progress(program.id) });
  const plan = plans.data?.find((candidate) => candidate.id === program.cardioPlanId);
  const week = progress.data?.semanas.find((candidate) => candidate.numero === program.semanaActual);

  const target = plan && week ? targetMinutesForWeek(plan.minutosObjetivo, plan.progresionPctSemana, week.numero) * week.sesionesPlan : null;
  const minutes = Math.round(week?.minutosCardio ?? 0);
  const days = plan?.diasSemana.map((day) => WEEKDAY_NAMES[day as Weekday].slice(0, 3)).join(' · ');

  return (
    <View
      accessibilityLabel={`Plan de cardio. ${plan ? cardioModalityLabels[plan.modalidad] : ''}. ${target !== null ? `${minutes} de ${target} minutos esta semana` : ''}`}
      style={{ gap: spacing.sm, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surfaceLow, padding: spacing.md }}
      testID="program-card-cardio"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Ionicons color={colors.volt} name="pulse-outline" size={iconSizes.md} />
        <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
          {plan ? `Cardio · ${cardioModalityLabels[plan.modalidad]}` : 'Plan de cardio'}
        </Text>
        {program.multiplicador > 1 ? <Badge label={multiplierLabel(program.multiplicador)} tone="success" /> : null}
      </View>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
        Semana {program.semanaActual ?? '—'} de {program.semanasTotales}
        {days ? ` · ${days}` : ''}
      </Text>
      {target !== null ? (
        <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }} testID="cardio-week-minutes">
          {minutes} / {target} min
        </Text>
      ) : null}
      {strengthToday ? (
        <Text style={{ color: colors.warning, fontSize: fontSizes.sm }} testID="weights-first">
          Haz primero las pesas.
        </Text>
      ) : null}
      <Button label="Registrar cardio" onPress={() => router.push('/routines/cardio/log')} />
    </View>
  );
}
