import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import type { MuscleExercise } from '@gymsheet/schemas';
import { Card, Divider, ScrollScreen, ScreenHeader, Section } from '@/components/layout';
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/feedback';
import { PressableScale } from '@/components/motion';
import { BackLink } from '@/components/nav';
import { Button } from '@/components/ui';
import { titleCase } from '@/components/catalogue-grid';
import { MuscleHero, muscleInfo } from '@/features/body-map';
import { muscleService } from '@/api/services';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';
import { routes } from '@/lib/routes';

const PAGE_SIZE = 30;

/** Cómo trabaja el músculo en el ejercicio, en el orden en que se enseña. */
const ROLES: readonly { role: MuscleExercise['rol']; title: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { role: 'PRIMARY', title: 'Lo trabajan de lleno', icon: 'flame-outline' },
  { role: 'SECONDARY', title: 'Lo trabajan de apoyo', icon: 'git-merge-outline' },
  { role: 'STABILIZER', title: 'Lo estabilizan', icon: 'shield-checkmark-outline' },
];

/**
 * Lámina del ejercicio sobre fondo claro, con el mismo tamaño y radio que las
 * filas del catálogo (`ExerciseImage` a 64 pt): dos listas de ejercicios que se
 * ven distintas parecen dos apps.
 */
function Thumb({ uri, label }: { uri: string | null; label: string }) {
  return (
    <View
      style={{
        width: 64,
        height: 64,
        borderRadius: radii.lg,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: uri ? colors.plate : colors.surfaceHigh,
        borderWidth: uri ? 0 : 1,
        borderColor: colors.border,
      }}
    >
      {uri ? (
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel={label}
          cachePolicy="memory-disk"
          contentFit="cover"
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          transition={120}
        />
      ) : (
        <Ionicons color={colors.textDisabled} name="barbell-outline" size={iconSizes.lg} />
      )}
    </View>
  );
}

function ExerciseRow({ exercise, onPress }: { exercise: MuscleExercise; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityLabel={exercise.nombre}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: minTouchTarget,
        paddingVertical: spacing.sm,
      }}
    >
      <Thumb label={exercise.imagen?.textoAlternativo ?? exercise.nombre} uri={exercise.imagen?.url ?? null} />
      <Text numberOfLines={2} style={{ flex: 1, color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
        {titleCase(exercise.nombre)}
      </Text>
      <Ionicons
        accessibilityElementsHidden
        color={colors.textDisabled}
        importantForAccessibility="no-hide-descendants"
        name="chevron-forward"
        size={iconSizes.md}
      />
    </PressableScale>
  );
}

/**
 * Pantalla de un músculo: es adonde lleva tocar la figura.
 *
 * Arriba, el músculo resaltado sobre la lámina; debajo, qué es y los ejercicios
 * que lo trabajan, separados por cómo lo trabajan. La lista se pide por páginas:
 * un músculo grande tiene cientos de ejercicios y bajarlos todos para ver diez
 * sería pagar por lo que nadie va a mirar.
 */
export default function MuscleScreen() {
  const { code: rawCode } = useLocalSearchParams<{ code: string }>();
  const code = (rawCode ?? '').toUpperCase();
  const router = useRouter();

  const muscle = useQuery({
    queryKey: ['muscle', code],
    queryFn: () => muscleService.get(code),
    enabled: Boolean(code),
    staleTime: 30 * 60 * 1000,
  });

  const exercises = useInfiniteQuery({
    queryKey: ['muscle', code, 'exercises'],
    queryFn: ({ pageParam }) => muscleService.exercises(code, { limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.offset + last.ejercicios.length < last.total ? last.offset + last.limit : undefined,
    enabled: Boolean(code),
  });

  // El nombre sale del catálogo local al instante; la API lo confirma y manda
  // la descripción. Así el título no parpadea mientras carga.
  const local = muscleInfo(code);
  const title = muscle.data?.nombre ?? local?.name ?? 'Músculo';
  const subtitle = muscle.data
    ? `${muscle.data.grupo.nombre} · ${muscle.data.nombreLatin}`
    : local
      ? `${local.group.name} · ${local.latinName}`
      : undefined;

  const items = exercises.data?.pages.flatMap((page) => page.ejercicios) ?? [];
  const total = exercises.data?.pages[0]?.total ?? 0;
  const related = exercises.data?.pages[0]?.aproximado ?? null;
  const open = (id: string) => router.push(routes.exercise(id));

  if (muscle.isError) {
    return (
      <ScrollScreen>
        <BackLink />
        <ErrorState error={muscle.error} onRetry={() => void muscle.refetch()} />
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen
      onRefresh={() => {
        void muscle.refetch();
        void exercises.refetch();
      }}
      refreshing={muscle.isFetching && !muscle.isPending}
    >
      <BackLink />
      <MuscleHero code={code} />
      <View style={{ gap: spacing.md }}>
        <ScreenHeader detail subtitle={subtitle} title={title} />
        {/* La descripción es texto de lectura, no un bloque aparte: en una
            tarjeta parecía un aviso y competía con la lista de debajo. */}
        {muscle.data?.descripcion ? (
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.md, lineHeight: 24 }}>
            {muscle.data.descripcion}
          </Text>
        ) : null}
        {exercises.data ? (
          <Text style={{ color: colors.textDisabled, fontSize: fontSizes.sm, fontWeight: semibold }}>
            {total} {total === 1 ? 'ejercicio' : 'ejercicios'}
            {related ? ` de ${related.nombre.toLowerCase()}` : ''}
          </Text>
        ) : null}
      </View>

      {exercises.isPending ? (
        <RowsSkeleton />
      ) : exercises.isError ? (
        <ErrorState error={exercises.error} onRetry={() => void exercises.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="barbell-outline"
          message="Todavía no hay ejercicios registrados para este músculo."
          title="Sin ejercicios"
        />
      ) : (
        <>
          {related ? (
            // No son ejercicios de este músculo: el dataset no los separa por
            // fascículo. Decirlo evita prometer «ejercicios de deltoides
            // lateral» y enseñar los de todo el deltoides sin avisar.
            <Card>
              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
                <Ionicons
                  accessibilityElementsHidden
                  color={colors.textMuted}
                  importantForAccessibility="no-hide-descendants"
                  name="information-circle-outline"
                  size={iconSizes.lg}
                />
                <Text style={{ flex: 1, color: colors.text, fontSize: fontSizes.sm, lineHeight: 22 }}>
                  Ningún ejercicio trabaja solo este músculo. Estos entrenan{' '}
                  <Text style={{ fontWeight: semibold }}>{related.nombre.toLowerCase()}</Text>, un
                  músculo relacionado.
                </Text>
              </View>
            </Card>
          ) : null}
          {ROLES.map(({ role, title: roleTitle, icon }, index) => {
            const rows = items.filter((item) => item.rol === role);
            if (rows.length === 0) return null;
            return (
              <Section icon={icon} index={index} key={role} title={roleTitle}>
                <Card list>
                  {rows.map((exercise, rowIndex) => (
                    <View key={exercise.id}>
                      {rowIndex > 0 ? <Divider /> : null}
                      <ExerciseRow exercise={exercise} onPress={() => open(exercise.id)} />
                    </View>
                  ))}
                </Card>
              </Section>
            );
          })}
          {exercises.hasNextPage ? (
            <Button
              label="Ver más ejercicios"
              loading={exercises.isFetchingNextPage}
              onPress={() => void exercises.fetchNextPage()}
              variant="ghost"
            />
          ) : null}
        </>
      )}
    </ScrollScreen>
  );
}
