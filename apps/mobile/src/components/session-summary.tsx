import { Ionicons } from '@expo/vector-icons';
import { BREAKDOWN_LABEL, countUpDuration } from '@gymsheet/domain';
import type { PointsBreakdown } from '@gymsheet/schemas';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { progressionService } from '@/api/services';
import {
  CelebrationModal,
  markLevelSeen,
  type CelebrationSubject,
} from '@/components/celebration';
import { Card } from '@/components/layout';
import { CountUpText, PREMIUM_EASING } from '@/components/motion';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/state/auth-store';
import type { FinishedSession } from '@/state/session-reward-store';
import { accentPolicy, colors, fontSizes, iconSizes, radii, semibold, spacing } from '@/theme';

/**
 * «Sesión terminada»: el momento en que la app enseña causa y efecto.
 *
 * Primero lo ganado, contando desde cero. Después de dónde sale, partida a
 * partida. Después cómo mueve eso tu total y tu barra. Y al final, si la
 * sesión trajo insignias o un rango, la recompensa que se abre sola.
 */

const ROW_STEP = 90;
const BREAKDOWN_ORDER: readonly (keyof PointsBreakdown)[] = ['session', 'sets', 'volume', 'streak', 'badges'];

/** La barra del tramo: avanza lo que movió la sesión; si hubo ascenso, se llena y vuelve a empezar. */
function RewardTrack({
  from,
  to,
  leveledUp,
  delayMs,
  color,
}: {
  from: number;
  to: number;
  leveledUp: boolean;
  delayMs: number;
  color: string;
}) {
  const reduceMotion = useReducedMotion();
  const fill = useSharedValue(reduceMotion ? to : from);

  useEffect(() => {
    if (reduceMotion) {
      fill.value = to;
      return;
    }
    const easing = PREMIUM_EASING;
    fill.value = leveledUp
      ? withDelay(
          delayMs,
          withSequence(
            withTiming(1, { duration: 700, easing }),
            withTiming(0, { duration: 0 }),
            withTiming(to, { duration: 700, easing }),
          ),
        )
      : withDelay(delayMs, withTiming(to, { duration: 900, easing }));
    return () => cancelAnimation(fill);
  }, [delayMs, fill, leveledUp, reduceMotion, to]);

  const style = useAnimatedStyle(() => ({
    width: `${Math.min(1, Math.max(0, fill.value)) * 100}%`,
  }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(1, Math.max(0, to)) * 100) }}
      style={{ height: 8, borderRadius: radii.full, backgroundColor: colors.surfaceHigh, overflow: 'hidden' }}
    >
      <Animated.View style={[{ height: '100%', borderRadius: radii.full, backgroundColor: color }, style]} />
    </View>
  );
}

export function SessionSummary({
  session,
  onContinue,
}: {
  session: FinishedSession;
  onContinue: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const { reward } = session;

  const rows = BREAKDOWN_ORDER.filter((key) => reward.breakdown[key] > 0);
  const earnedMs = reduceMotion ? 0 : countUpDuration(0, reward.pointsEarned);
  // El desglose entra mientras la cifra todavía cuenta: se lee como «de aquí sale».
  const rowsAt = reduceMotion ? 0 : Math.round(earnedMs * 0.5);
  const totalAt = reduceMotion ? 0 : rowsAt + rows.length * ROW_STEP + 240;
  const totalMs = reduceMotion ? 0 : countUpDuration(reward.pointsBefore, reward.pointsAfter);

  const subjects = useMemo<CelebrationSubject[]>(() => {
    const cards: CelebrationSubject[] = reward.unlockedNow.map((badge) => ({ kind: 'badge', badge, fresh: true }));
    // El rango va el último: es lo más grande y cierra la cola.
    if (reward.leveledUp && reward.levelAfter) {
      cards.push({ kind: 'level', level: reward.levelAfter, fresh: true });
    }
    return cards;
  }, [reward]);

  const [queue, setQueue] = useState<CelebrationSubject[]>([]);
  const autoOpened = useRef(false);

  /**
   * La recompensa se abre sola, pero no encima de las cifras: espera a que el
   * total termine de contar y deja 600 ms para leerlo. Con movimiento reducido
   * no se abre sola; queda el botón.
   */
  useEffect(() => {
    if (reduceMotion || subjects.length === 0 || autoOpened.current) return;
    const timer = setTimeout(() => {
      autoOpened.current = true;
      setQueue(subjects);
    }, totalAt + totalMs + 600);
    return () => clearTimeout(timer);
  }, [reduceMotion, subjects, totalAt, totalMs]);

  /**
   * En cuanto una carta está en pantalla se confirma al servidor, igual que en
   * la web: ya se ha visto, y volver a abrirla sola en la senda sería ruido.
   * Si no se abre, sigue pendiente y la senda la abrirá la próxima vez.
   */
  /**
   * El ascenso ya se anuncia aquí («¡Has subido a…!»). Se anota como visto para
   * que la senda no lo detecte otra vez contra el rango anterior guardado.
   */
  const userId = useAuthStore((state) => state.principal?.id ?? null);
  const levelAfter = reward.leveledUp ? reward.levelAfter : null;
  useEffect(() => {
    if (userId && levelAfter) void markLevelSeen(userId, levelAfter);
  }, [userId, levelAfter]);

  const hasQueue = queue.length > 0;
  useEffect(() => {
    if (hasQueue) void progressionService.acknowledge().catch(() => undefined);
  }, [hasQueue]);

  const levelName = reward.levelAfter?.name ?? null;
  const trackColor = colors.volt;
  const distance =
    reward.leveledUp && levelName
      ? `Has subido a ${levelName}.`
      : reward.nextLevel && reward.pointsToNextLevel !== null
        ? `Te faltan ${reward.pointsToNextLevel.toLocaleString('es-ES')} puntos para ${reward.nextLevel.name}.`
        : 'Has llegado al final de la senda.';

  const facts = [
    session.duration,
    `${session.sets} ${session.sets === 1 ? 'serie' : 'series'}`,
    `${Math.round(session.volumeKg).toLocaleString('es-ES')} kg`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={{ gap: spacing.lg }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, fontVariant: ['tabular-nums'] }}>{facts}</Text>

      <Card>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: fontSizes.xs,
            fontWeight: semibold,
            letterSpacing: fontSizes.xs * 0.14,
            textTransform: 'uppercase',
          }}
        >
          Has ganado
        </Text>
        <View
          accessible
          accessibilityLabel={`Has ganado ${reward.pointsEarned} puntos`}
          style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}
        >
          <Text style={{ color: accentPolicy.ink, fontSize: fontSizes.display + 16, fontWeight: semibold }}>+</Text>
          <CountUpText
            style={{
              color: accentPolicy.ink,
              fontSize: fontSizes.display + 16,
              fontWeight: semibold,
              letterSpacing: -1.5,
              fontVariant: ['tabular-nums'],
            }}
            value={reward.pointsEarned}
          />
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.lg }}>puntos</Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          {rows.map((key, index) => (
            <Animated.View
              entering={
                reduceMotion
                  ? FadeIn.duration(1)
                  : FadeInDown.duration(280)
                      .easing(PREMIUM_EASING)
                      .withInitialValues({ transform: [{ translateY: 10 }] })
                      .delay(rowsAt + index * ROW_STEP)
              }
              key={key}
              style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}
            >
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.md, flex: 1 }}>{BREAKDOWN_LABEL[key]}</Text>
              <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold, fontVariant: ['tabular-nums'] }}>
                {`+${reward.breakdown[key].toLocaleString('es-ES')}`}
              </Text>
            </Animated.View>
          ))}
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.md }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
            {levelName ? `Tu total · ${levelName}` : 'Tu total'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
            <CountUpText
              delayMs={totalAt}
              from={reward.pointsBefore}
              style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: semibold, fontVariant: ['tabular-nums'] }}
              value={reward.pointsAfter}
            />
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>pts</Text>
          </View>
        </View>
        <RewardTrack
          color={trackColor}
          delayMs={totalAt}
          from={reward.levelProgressBefore}
          leveledUp={reward.leveledUp}
          to={reward.levelProgress}
        />
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{distance}</Text>
        {session.geoVerified ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Ionicons color={colors.success} name="location" size={iconSizes.sm} />
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Racha verificada en tu sede.</Text>
          </View>
        ) : null}
      </Card>

      {subjects.length > 0 ? (
        <Card accent={colors.volt}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Ionicons color={accentPolicy.ink} name="gift-outline" size={iconSizes.lg} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
                {subjects.length === 1 ? 'Tienes una recompensa' : `Tienes ${subjects.length} recompensas`}
              </Text>
              <Text numberOfLines={2} style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
                {subjects.map((item) => (item.kind === 'badge' ? item.badge.name : `Rango ${item.level.name}`)).join(' · ')}
              </Text>
            </View>
          </View>
          <Button icon="sparkles" label="Abrir recompensa" onPress={() => setQueue(subjects)} />
        </Card>
      ) : null}

      <Button label="Seguir" onPress={onContinue} variant={subjects.length > 0 ? 'ghost' : 'primary'} />

      <CelebrationModal onClose={() => setQueue([])} subjects={queue} />
    </View>
  );
}
