import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Text } from '@/components/text';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { DURATION, PREMIUM_EASING } from '@/components/motion';
import { accentPolicy, colors, iconSizes, radii, spacing } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 132;
const STROKE = 5;
const GAP = 6;
const AVATAR = SIZE - 2 * (STROKE + GAP);
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * La cara con el aro de completitud alrededor (el gesto de Tinder): el aro se
 * llena con el porcentaje que da el servidor y la píldora de abajo lo dice con
 * cifra. Sin dato todavía (`percent === null`) el aro queda en pista: mejor
 * callar que pintar un 0 % falso. El llenado anima una vez al llegar el dato;
 * con «Reducir movimiento» aparece ya lleno. Si la lectura falló (`failed`),
 * la píldora dice «Sin cargar»: el único «Reintentar» de esa falla es el de la
 * tarjeta de abajo, no dos botones iguales.
 */
export function CompletionAvatar({
  photoUrl,
  initials,
  percent,
  failed = false,
}: {
  photoUrl: string | null;
  initials: string;
  percent: number | null;
  /** The completion read failed: the pill says so; the retry lives in the error card only. */
  failed?: boolean;
}) {
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(0);
  const ratio = percent === null ? 0 : Math.min(Math.max(percent / 100, 0), 1);

  useEffect(() => {
    progress.value = reduceMotion ? ratio : withTiming(ratio, { duration: DURATION.slow, easing: PREMIUM_EASING });
  }, [progress, ratio, reduceMotion]);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: CIRCUMFERENCE * (1 - progress.value) }));
  const complete = percent === 100;
  // A photo that fails to load (expired link, offline) falls back to the initials, never a blank disc.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const shownUrl = photoUrl && photoUrl !== failedUrl ? photoUrl : null;

  const unloaded = failed && percent === null;
  const body = (
    <>
      <Svg height={SIZE} style={{ position: 'absolute' }} width={SIZE}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} fill="none" r={RADIUS} stroke={colors.surfaceHighest} strokeWidth={STROKE} />
        <AnimatedCircle
          animatedProps={ringProps}
          cx={SIZE / 2}
          cy={SIZE / 2}
          fill="none"
          r={RADIUS}
          stroke={colors.volt}
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeLinecap="round"
          strokeWidth={STROKE}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      <View style={{ marginTop: STROKE + GAP }}>
        {shownUrl ? (
          <Image
            accessibilityIgnoresInvertColors
            cachePolicy="memory-disk"
            contentFit="cover"
            onError={() => setFailedUrl(shownUrl)}
            recyclingKey={shownUrl}
            source={{ uri: shownUrl, width: AVATAR, height: AVATAR }}
            style={{ width: AVATAR, height: AVATAR, borderRadius: radii.full, backgroundColor: colors.surfaceHigh }}
            transition={160}
          />
        ) : (
          <View
            style={{
              width: AVATAR,
              height: AVATAR,
              borderRadius: radii.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.surfaceHighest,
            }}
          >
            <Text variant="display">{initials}</Text>
          </View>
        )}
      </View>
      {percent !== null || unloaded ? (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xxs,
            paddingHorizontal: spacing.smd,
            paddingVertical: spacing.xxs,
            borderRadius: radii.full,
            // Volt lives in the ring only: a complete profile reads in accent ink, not a second fill.
            backgroundColor: colors.surfaceHighest,
            borderWidth: 2,
            borderColor: colors.surface,
          }}
        >
          {unloaded ? <Ionicons color={colors.textSecondary} name="cloud-offline-outline" size={iconSizes.sm} /> : null}
          <Text style={complete ? { color: accentPolicy.ink } : undefined} strong variant="footnote">
            {unloaded ? 'Sin cargar' : complete ? 'Completo' : `${percent} %`}
          </Text>
        </View>
      ) : null}
    </>
  );
  const box = { width: SIZE, height: SIZE + spacing.smd, alignItems: 'center', alignSelf: 'center' } as const;

  return (
    <View accessible accessibilityLabel={percent === null ? 'Tu foto de perfil' : `Tu foto de perfil. Perfil completo al ${percent} %`} style={box}>
      {body}
    </View>
  );
}
