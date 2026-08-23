import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { ProgressionBadge, ProgressionLevel } from '@gymsheet/schemas';
import { PressableScale } from '@/components/motion';
import {
  cardGap,
  cardPadding,
  colors,
  fontSizes,
  iconSizes,
  radii,
  semibold,
  spacing,
} from '@/theme';

/**
 * Piezas de la senda.
 *
 * Están aquí y no dentro de la pantalla porque la web dibuja exactamente lo
 * mismo con su propio componente: separar las piezas hace visible qué tiene que
 * coincidir entre plataformas —la geometría del raíl, los estados de un nodo,
 * la escala de las insignias— y qué es libre.
 *
 * Ninguna de estas piezas conoce un solo nombre de rango. Todo —nombre, frase,
 * icono, color— llega del servidor, porque el catálogo lo administra el
 * gimnasio y una copia local se desincronizaría al primer cambio.
 */

/** Diámetro del nodo de un hito alcanzado. */
const NODE = 44;
/** Grosor del raíl que une los hitos. */
const RAIL = 2;

/**
 * Un color de marca sobre superficie oscura, rebajado a fondo.
 *
 * Se compone con alfa en vez de mezclar hacia el negro porque el catálogo trae
 * los colores como hexadecimal de seis dígitos y mezclarlos exigiría convertir
 * a RGB aquí; el alfa sobre una superficie ya oscura da el mismo resultado.
 */
function withAlpha(hex: string, alpha: number): string {
  const clamped = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
  return `${hex}${clamped.toString(16).padStart(2, '0')}`;
}

/**
 * Barra de avance dentro del tramo actual.
 *
 * El relleno lleva el color del rango que se persigue, no el de la marca: lo
 * que la barra mide es la distancia hasta *ese* hito, y pintarla del acento
 * general la convertiría en una barra de carga cualquiera.
 */
export function ProgressTrack({
  ratio,
  color,
  height = 8,
}: {
  ratio: number;
  color: string;
  height?: number;
}) {
  const clamped = Math.min(1, Math.max(0, ratio));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{
        height,
        borderRadius: radii.full,
        backgroundColor: colors.surfaceHigh,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          // Un tramo recién empezado debe verse empezado: sin este mínimo, el
          // 1 % es un pixel y la barra parece vacía justo cuando más importa
          // confirmar que el primer entrenamiento contó.
          width: `${Math.max(clamped * 100, clamped > 0 ? 3 : 0)}%`,
          height: '100%',
          borderRadius: radii.full,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/**
 * Latido del hito actual.
 *
 * Solo late uno: es el que dice «estás aquí». Dos elementos latiendo dejarían de
 * señalar y pasarían a ser decoración. Se detiene con «reducir movimiento».
 */
function useHeartbeat(active: boolean) {
  const pulse = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!active || reduceMotion) {
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [active, pulse, reduceMotion]);

  return useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.06 }],
    opacity: 0.55 + pulse.value * 0.45,
  }));
}

/**
 * Un hito del camino.
 *
 * Tres estados, y los tres se leen: conseguido (color propio, lleno), actual
 * (color propio, anillo que late) y pendiente (apagado, pero con su nombre y
 * sus puntos legibles). Los pendientes **no** se ocultan ni se tapan con
 * interrogantes: el camino solo tira hacia delante si se ve hacia dónde va.
 */
export function PathNode({
  level,
  isLast,
  points,
}: {
  level: ProgressionLevel;
  isLast: boolean;
  /** Puntos actuales, para decir cuánto falta exactamente. */
  points: number;
}) {
  const heartbeat = useHeartbeat(level.current);
  const reached = level.unlocked;
  const tint = reached ? level.color : colors.textDisabled;
  const remaining = Math.max(0, level.minPoints - points);

  return (
    <View style={{ flexDirection: 'row', gap: spacing.md }}>
      {/* Columna del raíl: el nodo y la línea que baja al siguiente. */}
      <View style={{ alignItems: 'center', width: NODE }}>
        <View style={{ width: NODE, height: NODE, alignItems: 'center', justifyContent: 'center' }}>
          {level.current ? (
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  width: NODE,
                  height: NODE,
                  borderRadius: radii.full,
                  borderWidth: 2,
                  borderColor: level.color,
                },
                heartbeat,
              ]}
            />
          ) : null}
          <View
            style={{
              width: NODE - 10,
              height: NODE - 10,
              borderRadius: radii.full,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: reached ? level.color : colors.border,
              backgroundColor: reached ? withAlpha(level.color, 0.16) : colors.surfaceHigh,
            }}
          >
            <Ionicons
              color={tint}
              name={level.icon as keyof typeof Ionicons.glyphMap}
              size={iconSizes.md}
            />
          </View>
        </View>
        {isLast ? null : (
          <View
            style={{
              flex: 1,
              width: RAIL,
              minHeight: spacing.lg,
              // El raíl se pinta del color del hito de arriba cuando ya se pasó
              // por él: así el camino recorrido se ve como una línea continua
              // encendida, y el que queda como una guía apagada.
              backgroundColor: reached ? withAlpha(level.color, 0.5) : colors.borderSubtle,
            }}
          />
        )}
      </View>

      <View style={{ flex: 1, paddingBottom: spacing.lg, gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text
            style={{
              color: reached ? colors.text : colors.textDisabled,
              fontSize: fontSizes.md,
              fontWeight: semibold,
              flexShrink: 1,
            }}
          >
            {level.name}
          </Text>
          {level.current ? (
            <View
              style={{
                paddingHorizontal: spacing.xs,
                paddingVertical: 2,
                borderRadius: radii.full,
                backgroundColor: withAlpha(level.color, 0.18),
              }}
            >
              <Text
                style={{
                  color: level.color,
                  fontSize: fontSizes.xs,
                  fontWeight: semibold,
                  letterSpacing: fontSizes.xs * 0.08,
                  textTransform: 'uppercase',
                }}
              >
                Estás aquí
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          style={{
            color: reached ? colors.textMuted : colors.textDisabled,
            fontSize: fontSizes.sm,
            lineHeight: 20,
          }}
        >
          {level.tagline}
        </Text>
        {!reached ? (
          <Text style={{ color: colors.textDisabled, fontSize: fontSizes.xs }}>
            {`Te faltan ${remaining.toLocaleString('es-ES')} puntos`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const RARITY_LABEL: Record<string, string> = {
  COMUN: 'Común',
  RARA: 'Rara',
  EPICA: 'Épica',
  LEGENDARIA: 'Legendaria',
};

/**
 * Una insignia.
 *
 * Conseguida: a todo color, con su línea de sabor —la frase es el premio tanto
 * como el icono—. Pendiente: apagada, pero con su barra y su cuenta exacta
 * («8 / 9»), porque una insignia sin distancia visible no motiva a nadie.
 */
export function BadgeTile({
  badge,
  onPress,
}: {
  badge: ProgressionBadge;
  onPress?: () => void;
}) {
  const tint = badge.earned ? badge.color : colors.textDisabled;

  const content = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radii.md,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: badge.earned ? withAlpha(badge.color, 0.45) : colors.borderSubtle,
            backgroundColor: badge.earned ? withAlpha(badge.color, 0.14) : colors.surfaceHigh,
          }}
        >
          <Ionicons
            color={tint}
            name={badge.icon as keyof typeof Ionicons.glyphMap}
            size={iconSizes.md}
          />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            numberOfLines={1}
            style={{
              color: badge.earned ? colors.text : colors.textMuted,
              fontSize: fontSizes.sm,
              fontWeight: semibold,
            }}
          >
            {badge.name}
          </Text>
          <Text numberOfLines={1} style={{ color: colors.textDisabled, fontSize: fontSizes.xs }}>
            {RARITY_LABEL[badge.rarity] ?? badge.rarity}
            {badge.pointsReward > 0 ? ` · +${badge.pointsReward} pts` : ''}
          </Text>
        </View>
        {badge.isNew ? (
          <View
            style={{
              paddingHorizontal: spacing.xs,
              paddingVertical: 2,
              borderRadius: radii.full,
              backgroundColor: withAlpha(badge.color, 0.2),
            }}
          >
            <Text style={{ color: badge.color, fontSize: fontSizes.xs, fontWeight: semibold }}>
              NUEVA
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
        {badge.earned ? (badge.flavorText ?? badge.description) : badge.description}
      </Text>

      {!badge.earned && badge.progress !== null ? (
        <View style={{ gap: spacing.xs }}>
          <ProgressTrack color={colors.textDisabled} height={4} ratio={badge.progress} />
          <Text style={{ color: colors.textDisabled, fontSize: fontSizes.xs }}>
            {badge.progressLabel}
          </Text>
        </View>
      ) : null}
    </>
  );

  const surface = {
    gap: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: badge.earned ? withAlpha(badge.color, 0.28) : colors.borderSubtle,
    backgroundColor: colors.surfaceLow,
    padding: cardPadding - 4,
    // Las pendientes se apagan sin desaparecer: siguen siendo el objetivo.
    opacity: badge.earned ? 1 : 0.72,
  } as const;

  if (onPress) {
    return (
      <PressableScale accessibilityLabel={badge.name} onPress={onPress} style={surface}>
        {content}
      </PressableScale>
    );
  }
  return <View style={surface}>{content}</View>;
}

/**
 * Cabecera de la senda: quién eres ahora y cuánto falta para lo siguiente.
 *
 * Los puntos son el único número con el acento de la marca. Es la política de
 * acento del proyecto —el acento es para la acción principal y para la cifra
 * por la que existe la pantalla— y esta pantalla existe por esa cifra.
 */
export function RankHero({
  level,
  nextLevel,
  points,
  pointsToNextLevel,
  levelProgress,
}: {
  level: ProgressionLevel | null;
  nextLevel: ProgressionLevel | null;
  points: number;
  pointsToNextLevel: number | null;
  levelProgress: number;
}) {
  return (
    <View
      style={{
        gap: cardGap,
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: level ? withAlpha(level.color, 0.3) : colors.borderSubtle,
        backgroundColor: colors.surfaceLow,
        padding: cardPadding,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radii.full,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: level ? withAlpha(level.color, 0.5) : colors.border,
            backgroundColor: level ? withAlpha(level.color, 0.16) : colors.surfaceHigh,
          }}
        >
          <Ionicons
            color={level?.color ?? colors.textDisabled}
            name={(level?.icon ?? 'footsteps-outline') as keyof typeof Ionicons.glyphMap}
            size={iconSizes.xl}
          />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, letterSpacing: 1 }}>
            TU RANGO
          </Text>
          <Text
            style={{
              color: colors.text,
              fontSize: fontSizes.xl,
              fontWeight: semibold,
              letterSpacing: fontSizes.xl * -0.02,
            }}
          >
            {level?.name ?? 'Sin empezar'}
          </Text>
        </View>
      </View>

      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 21 }}>
        {level?.tagline ?? 'Registra tu primer entrenamiento y la senda empieza.'}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
        <Text
          style={{
            color: colors.volt,
            fontSize: fontSizes['2xl'],
            fontWeight: semibold,
            letterSpacing: fontSizes['2xl'] * -0.03,
          }}
        >
          {points.toLocaleString('es-ES')}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>puntos</Text>
      </View>

      <View style={{ gap: spacing.xs }}>
        <ProgressTrack color={nextLevel?.color ?? level?.color ?? colors.volt} ratio={levelProgress} />
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
          {nextLevel && pointsToNextLevel !== null
            ? `Te faltan ${pointsToNextLevel.toLocaleString('es-ES')} puntos para ${nextLevel.name}`
            : 'Has llegado al final de la senda. Ahora se trata de mantenerlo.'}
        </Text>
      </View>
    </View>
  );
}
