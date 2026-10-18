import { Ionicons } from '@expo/vector-icons';
import { BREAKDOWN_LABEL, countUpDuration, streakSummary } from '@gymsheet/domain';
import type { PointsBreakdown, SessionReward } from '@gymsheet/schemas';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
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
  rarityOf,
  rewardCelebrations,
  subjectTitle,
  type CelebrationSubject,
} from '@/components/celebration';
import { RewardCardBack } from '@/components/cards/reward-card';
import { Card } from '@/components/layout';
import { ChallengesList } from '@/components/progression/challenges';
import { NearestList } from '@/components/progression/nearest';
import { CountUpText, DURATION, EnterUp, PREMIUM_EASING } from '@/components/motion';
import { Text as UIText } from '@/components/text';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/state/auth-store';
import type { FinishedSession } from '@/state/session-reward-store';
import {
  alpha,
  colors,
  fontSizes,
  iconSizes,
  ink,
  metricColors,
  radii,
  semibold,
  spacing,
  textVariants,
  type MetricKey,
} from '@/theme';

/**
 * «Sesión terminada»: el momento en que la app enseña causa y efecto.
 *
 * Primero lo ganado, contando desde cero. Después de dónde sale, partida a
 * partida. Después cómo mueve eso tu total y tu barra. Y al final, si la
 * sesión trajo insignias o un rango, la recompensa que se abre sola.
 */

/** Escalonado del desglose: una fila cada 90 ms mientras la cifra cuenta. */
const ROW_STEP = 90;
const BREAKDOWN_ORDER: readonly (keyof PointsBreakdown)[] = ['session', 'sets', 'volume', 'streak', 'challenges', 'badges', 'modes'];

/** De dónde sale cada partida: un glifo y el color de su magnitud, los mismos que en el entreno. */
const BREAKDOWN_GLYPH: Readonly<
  Record<keyof PointsBreakdown, { icon: keyof typeof Ionicons.glyphMap; metric: MetricKey }>
> = {
  session: { icon: 'checkmark-circle', metric: 'rest' },
  sets: { icon: 'layers', metric: 'reps' },
  volume: { icon: 'barbell', metric: 'weight' },
  streak: { icon: 'flame', metric: 'streak' },
  badges: { icon: 'ribbon', metric: 'record' },
  modes: { icon: 'flash', metric: 'effort' },
  challenges: { icon: 'flag', metric: 'time' },
};

/** Las cartas que esperan, bocabajo y en abanico: se ve cuántas y de qué rareza, no cuáles. */
function RewardFan({ subjects }: { subjects: readonly CelebrationSubject[] }) {
  const shown = subjects.slice(0, 3);
  const width = 46;
  const height = width * 1.4;
  const spread = shown.length - 1;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no" style={{ width: width + spread * 18 + 12, height: height + 8 }}>
      {shown.map((item, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            left: 6 + index * 18,
            top: 4,
            width,
            height,
            transform: [{ rotate: `${(index - spread / 2) * 9}deg` }],
          }}
        >
          <RewardCardBack height={height} rarity={rarityOf(item)} width={width} />
        </View>
      ))}
    </View>
  );
}

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
            withTiming(1, { duration: DURATION.slow + DURATION.standard, easing }),
            withTiming(0, { duration: 0 }),
            withTiming(to, { duration: DURATION.slow + DURATION.standard, easing }),
          ),
        )
      : withDelay(delayMs, withTiming(to, { duration: DURATION.slow * 2, easing }));
    return () => cancelAnimation(fill);
  }, [delayMs, fill, leveledUp, reduceMotion, to]);

  const style = useAnimatedStyle(() => ({
    width: `${Math.min(1, Math.max(0, fill.value)) * 100}%`,
  }));
  // Un destello recorre la barra cuando llega: «esto se acaba de mover».
  const shine = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    shine.value = withDelay(delayMs + DURATION.slow * 2, withTiming(1, { duration: 900, easing: PREMIUM_EASING }));
    return () => cancelAnimation(shine);
  }, [delayMs, reduceMotion, shine]);
  const shineStyle = useAnimatedStyle(() => ({
    opacity: shine.value <= 0 || shine.value >= 1 ? 0 : 0.55,
    transform: [{ translateX: -60 + shine.value * 420 }, { skewX: '-20deg' }],
  }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(1, Math.max(0, to)) * 100) }}
      style={{ height: 10, borderRadius: radii.full, backgroundColor: colors.surfaceHighest, overflow: 'hidden' }}
    >
      {/* Relleno absoluto y sin hijos: animar su ancho no recoloca nada más
          (la excepción de animate-expo) y conserva el radio, que `scaleX` deformaría. */}
      <Animated.View
        style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radii.full, backgroundColor: color }, style]}
      />
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', top: 0, bottom: 0, width: 36, backgroundColor: alpha(ink.white, 0.9) }, shineStyle]}
      />
    </View>
  );
}

export function SessionSummary({
  session,
  onContinue,
}: {
  session: Omit<FinishedSession, 'reward'> & { reward: SessionReward };
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

  // Pico-final: insignias → retos → semana redonda → comodín → premios → rango.
  const subjects = useMemo<CelebrationSubject[]>(() => rewardCelebrations(reward), [reward]);
  const doneNow = useMemo(() => new Set(reward.challengesCompletedNow.map((item) => item.code)), [reward]);

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
  // El color de los puntos (el mismo ámbar de las insignias), no el acento: el
  // acento del resumen es de la acción.
  const trackColor = metricColors.record.ink;
  const distance =
    reward.leveledUp && levelName
      ? `Has subido a ${levelName}.`
      : reward.nextLevel && reward.pointsToNextLevel !== null
        ? `Te faltan ${reward.pointsToNextLevel.toLocaleString('es-ES')} puntos para ${reward.nextLevel.name}.`
        : 'Has llegado al final de la senda.';

  // «Seguir» y «Abrir recompensa» sólo responden una vez por toque real: un
  // doble toque en «Seguir» navegaba dos veces y dejaba la lista montada doble.
  const leaving = useRef(false);
  const goOn = () => {
    if (leaving.current) return;
    leaving.current = true;
    onContinue();
  };
  const openRewards = () => {
    autoOpened.current = true;
    setQueue((current) => (current.length > 0 ? current : subjects));
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: radii.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: metricColors.record.tint,
              borderWidth: 1,
              borderColor: metricColors.record.edge,
            }}
          >
            <Ionicons color={metricColors.record.ink} name="sparkles" size={iconSizes.lg} />
          </View>
          <View style={{ flex: 1 }}>
            <UIText accessibilityRole="header" tone="secondary" variant="subhead">
              Puntos de la sesión
            </UIText>
            {/* Sin puntos no se pinta «+0»: una cifra que cuenta hasta cero es un
                parpadeo, no un dato. */}
            {reward.pointsEarned > 0 ? (
              <View
                accessible
                accessibilityLabel={`Has ganado ${reward.pointsEarned} puntos`}
                style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}
              >
                <CountUpText
                  prefix="+"
                  style={[textVariants.display, { color: colors.text, fontVariant: ['tabular-nums'] }]}
                  value={reward.pointsEarned}
                />
                <UIText tone="muted" variant="body">
                  puntos
                </UIText>
              </View>
            ) : (
              <UIText tone="muted" variant="subhead">
                Esta sesión no sumó puntos.
              </UIText>
            )}
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          {rows.map((key, index) => {
            const glyph = BREAKDOWN_GLYPH[key];
            const tone = metricColors[glyph.metric];
            return (
              // Entran en cascada mientras la cifra cuenta: «de aquí sale».
              <EnterUp index={index} key={key}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 36 }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: radii.md,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: tone.tint,
                    }}
                  >
                    <Ionicons color={tone.ink} name={glyph.icon} size={iconSizes.sm} />
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: fontSizes.sm, flex: 1 }}>{BREAKDOWN_LABEL[key]}</Text>
                  <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold, fontVariant: ['tabular-nums'] }}>
                    {`+${reward.breakdown[key].toLocaleString('es-ES')}`}
                  </Text>
                </View>
              </EnterUp>
            );
          })}
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.footnote }}>Tu rango</Text>
            <Text numberOfLines={1} style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: semibold }}>
              {levelName ?? 'Tu total'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
            <CountUpText
              delayMs={totalAt}
              from={reward.pointsBefore}
              style={{ color: metricColors.record.ink, fontSize: fontSizes.xl, fontWeight: semibold, fontVariant: ['tabular-nums'] }}
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
        <Text style={{ color: colors.textSecondary, fontSize: fontSizes.sm }}>{distance}</Text>
        {reward.streak && reward.streak.current > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Ionicons color={metricColors.streak.ink} name="flame" size={iconSizes.sm} />
            <Text style={{ color: colors.textSecondary, fontSize: fontSizes.sm, fontVariant: ['tabular-nums'] }}>
              {reward.streak.milestoneNow
                ? `${streakSummary(reward.streak)} · ¡hito de ${reward.streak.milestoneNow}!`
                : streakSummary(reward.streak)}
            </Text>
          </View>
        ) : null}
        {session.geoVerified ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Ionicons color={colors.success} name="location" size={iconSizes.sm} />
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Racha verificada en tu sede.</Text>
          </View>
        ) : null}
      </Card>

      {reward.challenges && reward.challenges.items.length > 0 ? (
        // Zeigarnik: la barra a medio llenar es lo que trae de vuelta. Lo
        // cumplido en esta sesión se marca «¡Hecho ahora!».
        <Card>
          <UIText accessibilityRole="header" variant="headline">
            Retos de la semana
          </UIText>
          <ChallengesList baseDelayMs={totalAt} highlight={doneNow} week={reward.challenges} />
        </Card>
      ) : null}

      {reward.nearest.some((badge) => !badge.earned) ? (
        <Card>
          <UIText accessibilityRole="header" variant="headline">
            Lo más cerca
          </UIText>
          <NearestList badges={reward.nearest} delayMs={totalAt} limit={2} />
        </Card>
      ) : null}

      {subjects.length > 0 ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <RewardFan subjects={subjects} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
                {subjects.length === 1 ? 'Te espera una carta' : `Te esperan ${subjects.length} cartas`}
              </Text>
              <Text numberOfLines={2} style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
                {subjects.map(subjectTitle).join(' · ')}
              </Text>
            </View>
          </View>
          <Button icon="sparkles" label={subjects.length === 1 ? 'Abrir carta' : 'Abrir cartas'} onPress={openRewards} />
        </Card>
      ) : null}

      <Button icon="arrow-forward" iconPosition="end" label="Seguir" onPress={goOn} variant={subjects.length > 0 ? 'ghost' : 'primary'} />

      <CelebrationModal onClose={() => setQueue([])} subjects={queue} />
    </View>
  );
}
