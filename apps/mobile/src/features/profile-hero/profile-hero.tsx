import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { HeroSurface } from '@/components/hero-surface';
import { Text } from '@/components/text';
import { accentPolicy, colors, iconSizes, radii, spacing } from '@/theme';

/** Avatar del héroe: 96 pt de foto dentro de un aro de acento de 2 pt. */
const AVATAR = 88;
const RING_WIDTH = 2;
const RING_GAP = 3;

/**
 * La cara de la persona, grande y con aro de acento. El aro es estático (no
 * late ni gira) y usa la tinta legible del acento, no el relleno: el acento
 * fuerte queda para la acción principal. La foto se pide al tamaño al que se
 * pinta y con caché en memoria y disco.
 */
export function HeroAvatar({ photoUrl, initials }: { photoUrl: string | null; initials: string }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        padding: RING_GAP,
        borderRadius: radii.full,
        borderWidth: RING_WIDTH,
        borderColor: accentPolicy.ink,
        alignSelf: 'flex-start',
      }}
    >
      {photoUrl ? (
        <Image
          accessibilityIgnoresInvertColors
          cachePolicy="memory-disk"
          contentFit="cover"
          recyclingKey={photoUrl}
          source={{ uri: photoUrl, width: AVATAR, height: AVATAR }}
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
  );
}

/** El rango de la senda como chip: trofeo + nombre del nivel. */
export function RankChip({ label }: { label: string }) {
  return (
    <View
      accessibilityLabel={`Rango ${label}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: spacing.xs,
        paddingHorizontal: spacing.smd,
        paddingVertical: spacing.xs,
        borderRadius: radii.full,
        backgroundColor: colors.surfaceHighest,
      }}
    >
      <Ionicons color={accentPolicy.ink} name="trophy-outline" size={iconSizes.sm} />
      <Text strong variant="subhead">
        {label}
      </Text>
    </View>
  );
}

export type HeroStatItem = { key: string; value: number; label: string };

/**
 * Las cifras del héroe: la primera es la protagonista (`textVariants.hero`,
 * una por pantalla) y el resto van en la cifra secundaria de la rampa.
 */
export function HeroStats({ stats }: { stats: readonly HeroStatItem[] }) {
  const [lead, ...rest] = stats;
  if (!lead) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', columnGap: spacing.lg, rowGap: spacing.sm }}>
      <View accessible accessibilityLabel={`${lead.value.toLocaleString('es-ES')} ${lead.label}`}>
        <Text numberOfLines={1} variant="hero">
          {lead.value.toLocaleString('es-ES')}
        </Text>
        <Text tone="secondary" variant="footnote">
          {lead.label}
        </Text>
      </View>
      {rest.map((stat) => (
        <View
          accessible
          accessibilityLabel={`${stat.value.toLocaleString('es-ES')} ${stat.label}`}
          key={stat.key}
          style={{ paddingBottom: spacing.xxs }}
        >
          <Text numberOfLines={1} variant="numeric">
            {stat.value.toLocaleString('es-ES')}
          </Text>
          <Text tone="secondary" variant="footnote">
            {stat.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * La superficie de identidad, común al perfil propio y al ajeno: avatar con
 * aro, nombre, rango y, debajo, lo que cada pantalla quiera enseñar (cifras,
 * avance, acciones). Una sola `HeroSurface` por pantalla.
 */
export function ProfileHero({
  name,
  photoUrl,
  initials,
  rank,
  meta,
  children,
  testID,
}: {
  name: string;
  photoUrl: string | null;
  initials: string;
  /** Nombre del nivel; nulo si aún no hay senda que enseñar. */
  rank: string | null;
  /** Línea pequeña bajo el rango (estado social, rol de staff). */
  meta?: ReactNode;
  children?: ReactNode;
  testID?: string;
}) {
  return (
    <HeroSurface testID={testID} watermark>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <HeroAvatar initials={initials} photoUrl={photoUrl} />
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Text accessibilityRole="header" numberOfLines={2} variant="title">
            {name}
          </Text>
          {rank ? <RankChip label={rank} /> : null}
          {meta}
        </View>
      </View>
      {children}
    </HeroSurface>
  );
}

/** Concuerda la etiqueta con la cifra: «1 sesión», «3 sesiones». */
export function plural(value: number, one: string, many: string): string {
  return value === 1 ? one : many;
}
