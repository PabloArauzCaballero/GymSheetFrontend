import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Routine } from '@gymsheet/types';
import { PersonAvatar } from '@/components/person-avatar';
import { Text } from '@/components/text';
import { EnterUp } from '@/components/motion';
import { colors, iconSizes, metricColors, radii, ratingStar, spacing, type MetricKey } from '@/theme';
import { routineMinutes } from '@/features/routine-detail/routine-plan';

type Cell = {
  key: string;
  value: string;
  caption: string;
  accessibility: string;
  icon?: keyof typeof Ionicons.glyphMap;
  metric?: MetricKey;
};

/** Cinco estrellas pequeñas con medias: lo que la gente reconoce sin leer. */
export function RatingStars({ value, size = iconSizes.xs }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          color={ratingStar}
          key={n}
          name={value >= n - 0.25 ? 'star' : value >= n - 0.75 ? 'star-half' : 'star-outline'}
          size={size}
        />
      ))}
    </View>
  );
}

/**
 * Franja de cifras como la de una tienda de apps: cada celda es un número
 * grande y una palabra, separadas por un filo. Sin tarjeta ni sombra
 * (2026-10-18): va directa sobre el lienzo, entre dos filos, y se lee como la
 * continuación de la portada, no como otra caja que compite con el botón.
 */
function StatsStrip({ cells }: { cells: Cell[] }) {
  return (
    <View
      accessible
      accessibilityLabel={cells.map((cell) => cell.accessibility).join('. ')}
      style={{
        flexDirection: 'row',
        paddingVertical: spacing.md,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
      }}
      testID="routine-stats"
    >
      {cells.map((cell, index) => (
        <View
          key={cell.key}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: spacing.xs,
            paddingHorizontal: spacing.xs,
            borderLeftWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
            borderLeftColor: colors.border,
          }}
        >
          {/* Misma estructura en todas las celdas: icono, cifra, palabra. Así las
              cuatro cifras quedan en la misma línea. */}
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: radii.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: cell.metric ? metricColors[cell.metric].tint : colors.surfaceHigh,
            }}
          >
            <Ionicons
              color={cell.metric ? metricColors[cell.metric].ink : colors.accentInk}
              name={cell.icon ?? 'star'}
              size={iconSizes.sm}
            />
          </View>
          <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={{ color: colors.text }} variant="numeric">
            {cell.value}
          </Text>
          <Text adjustsFontSizeToFit minimumFontScale={0.85} numberOfLines={1} tone="muted" variant="caption">
            {cell.caption}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * De dónde sale una copia: «Basada en X de Ana». Quién la hizo, la nota y las
 * descargas ya van en la portada (`DetailHero`); aquí no se repiten.
 */
function AttributionRow({ routine }: { routine: Routine }) {
  if (!routine.atribucion) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd }}>
      <PersonAvatar
        id={routine.atribucion.authorId ?? routine.atribucion.authorName}
        name={routine.atribucion.authorName}
        size={36}
      />
      <Text style={{ flex: 1 }} testID="attribution" tone="secondary" variant="subhead">
        Basada en{' '}
        <Text strong variant="subhead">
          {routine.atribucion.routineName}
        </Text>{' '}
        de {routine.atribucion.authorName}
      </Text>
    </View>
  );
}

/**
 * Lo que va bajo la portada: qué es (días, semanas, minutos), de dónde sale si
 * es una copia y la descripción. El título, el objetivo y la prueba social
 * (autor, ★ y descargas) ya van sobre la imagen; aquí no se repiten.
 */
export function DetailHeader({ routine, actions }: { routine: Routine; actions?: ReactNode }) {
  const days = routine.dias.length;
  const minutes = routineMinutes(routine);
  const cells: Cell[] = [
    {
      key: 'days',
      value: String(days),
      caption: 'días/sem',
      icon: 'calendar-outline' as const,
      metric: 'reps' as const,
      accessibility: `${days} días por semana`,
    },
    ...(routine.duracionSemanas
      ? [
          {
            key: 'weeks',
            value: String(routine.duracionSemanas),
            caption: 'semanas',
            icon: 'time-outline' as const,
            metric: 'time' as const,
            accessibility: `${routine.duracionSemanas} semanas`,
          },
        ]
      : []),
    ...(minutes > 0
      ? [
          {
            key: 'min',
            value: `${minutes}`,
            caption: 'min/sesión',
            icon: 'timer-outline' as const,
            metric: 'rest' as const,
            accessibility: `unos ${minutes} minutos por sesión`,
          },
        ]
      : []),
  ];

  return (
    <View style={{ gap: spacing.xl }}>
      <EnterUp index={0}>
        <StatsStrip cells={cells} />
      </EnterUp>
      {routine.atribucion ? (
        <EnterUp index={1}>
          <AttributionRow routine={routine} />
        </EnterUp>
      ) : null}
      {routine.descripcion ? (
        <EnterUp index={2}>
          <Text selectable tone="secondary" variant="body">
            {routine.descripcion}
          </Text>
        </EnterUp>
      ) : null}
      <EnterUp index={3}>{actions}</EnterUp>
    </View>
  );
}
