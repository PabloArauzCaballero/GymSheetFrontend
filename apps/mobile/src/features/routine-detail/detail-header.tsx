import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { compactCount, ratingLabel, ratingValue } from '@gymsheet/hooks';
import type { Routine } from '@gymsheet/types';
import { PersonAvatar } from '@/components/person-avatar';
import { Text } from '@/components/text';
import { colors, iconSizes, radii, ratingStar, shadows, spacing } from '@/theme';
import { routineMinutes } from '@/features/routine-detail/routine-plan';

type Cell = {
  key: string;
  value: string;
  caption: string;
  accessibility: string;
  stars?: number | null;
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
 * grande y una palabra. Se entiende de un vistazo y sin chips: «4,6 ★★★★½ ·
 * 12 descargas · 4 días/sem · 8 semanas».
 */
function StatsStrip({ cells }: { cells: Cell[] }) {
  return (
    <View
      accessible
      accessibilityLabel={cells.map((cell) => cell.accessibility).join('. ')}
      style={{
        flexDirection: 'row',
        paddingVertical: spacing.mdl,
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceLow,
        boxShadow: shadows.e1,
      }}
      testID="routine-stats"
    >
      {cells.map((cell, index) => (
        <View
          key={cell.key}
          style={{
            flex: 1,
            alignItems: 'center',
            gap: spacing.xs,
            paddingHorizontal: spacing.xs,
            borderLeftWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
            borderLeftColor: colors.border,
          }}
        >
          <Text numberOfLines={1} style={{ color: colors.text }} variant="numeric">
            {cell.value}
          </Text>
          {cell.stars != null ? <RatingStars value={cell.stars} /> : null}
          <Text numberOfLines={1} tone="muted" variant="caption">
            {cell.caption}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Quién hizo la rutina: su foto (o iniciales) y su nombre. */
function AuthorRow({ routine }: { routine: Routine }) {
  if (routine.esOficial) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd }}>
        <PersonAvatar id="repp" name="REPP" official size={44} />
        <View style={{ flex: 1 }}>
          <Text tone="muted" variant="footnote">
            Rutina oficial
          </Text>
          <Text variant="headline">Equipo REPP</Text>
        </View>
      </View>
    );
  }
  if (routine.atribucion) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd }}>
        <PersonAvatar
          id={routine.atribucion.authorId ?? routine.atribucion.authorName}
          name={routine.atribucion.authorName}
          size={44}
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
  if (routine.esMia || !routine.autor) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd }} testID="routine-author">
      <PersonAvatar id={routine.autor.id} name={routine.autor.nombre} photoUrl={routine.autor.fotoUrl} size={44} />
      <View style={{ flex: 1 }}>
        <Text tone="muted" variant="footnote">
          Creada por
        </Text>
        <Text numberOfLines={1} variant="headline">
          {routine.autor.nombre}
        </Text>
      </View>
    </View>
  );
}

/**
 * Lo que va bajo la portada: autor, cifras y descripción. El título y el
 * objetivo ya van sobre la imagen; aquí no se repiten.
 */
export function DetailHeader({ routine, actions }: { routine: Routine; actions?: ReactNode }) {
  const days = routine.dias.length;
  const minutes = routineMinutes(routine);
  const community = routine.visibilidad === 'PUBLIC' || routine.esOficial || routine.copias > 0;
  const rating = ratingValue(routine.valoracion);
  const cells: Cell[] = [
    ...(community
      ? [
          {
            key: 'rating',
            value: rating ?? 'Nueva',
            caption: rating
              ? `${routine.valoracion.total} ${routine.valoracion.total === 1 ? 'reseña' : 'reseñas'}`
              : 'Sin reseñas',
            accessibility: ratingLabel(routine.valoracion).replace('★', 'Valoración'),
            stars: routine.valoracion.promedio,
          },
          {
            key: 'downloads',
            value: compactCount(routine.copias),
            caption: routine.copias === 1 ? 'descarga' : 'descargas',
            accessibility: `${routine.copias} ${routine.copias === 1 ? 'descarga' : 'descargas'}`,
          },
        ]
      : []),
    {
      key: 'days',
      value: String(days),
      caption: 'días/sem',
      accessibility: `${days} días por semana`,
    },
    ...(routine.duracionSemanas
      ? [
          {
            key: 'weeks',
            value: String(routine.duracionSemanas),
            caption: 'semanas',
            accessibility: `${routine.duracionSemanas} semanas`,
          },
        ]
      : []),
    ...(minutes > 0 && (!community || !routine.duracionSemanas)
      ? [
          {
            key: 'min',
            value: `${minutes}`,
            caption: 'min/sesión',
            accessibility: `unos ${minutes} minutos por sesión`,
          },
        ]
      : []),
  ];

  return (
    <View style={{ gap: spacing.lg }}>
      <AuthorRow routine={routine} />
      <StatsStrip cells={cells.slice(0, 4)} />
      {actions}
      {routine.descripcion ? (
        <Text selectable tone="secondary" variant="body">
          {routine.descripcion}
        </Text>
      ) : null}
    </View>
  );
}
