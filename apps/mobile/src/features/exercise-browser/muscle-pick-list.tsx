import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import type { Exercise } from '@gymsheet/types';
import { exerciseService, muscleService } from '@/api/services';
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/feedback';
import { Card, Divider } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { Button } from '@/components/ui';
import { titleCase } from '@/components/catalogue-grid';
import { notify } from '@/notifications';
import { muscleInfo } from '@/features/body-map';
import { PickButton } from '@/features/exercise-browser/exercise-row';
import type { PickConfig } from '@/features/exercise-browser/types';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

const PAGE_SIZE = 30;

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
        backgroundColor: uri ? '#ffffff' : colors.surfaceHigh,
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

/**
 * Ejercicios de un músculo dentro del selector del asistente. Es la versión en
 * línea de la pantalla de músculo de la pestaña Ejercicios: el asistente tiene
 * que seguir en su propia pila (con su barra de progreso y su botón Atrás), así
 * que no puede saltar a la pestaña de al lado.
 *
 * Esta lista no trae el grupo muscular de cada ejercicio, que el asistente
 * necesita para sus avisos: al añadir se pide la ficha completa.
 */
export function MusclePickList({ code, pick }: { code: string; pick: PickConfig }) {
  const queryClient = useQueryClient();
  const exercises = useInfiniteQuery({
    queryKey: ['muscle', code, 'exercises'],
    queryFn: ({ pageParam }) =>
      muscleService.exercises(code, { limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.offset + last.ejercicios.length < last.total ? last.offset + last.limit : undefined,
  });

  const items = exercises.data?.pages.flatMap((page) => page.ejercicios) ?? [];
  const total = exercises.data?.pages[0]?.total ?? 0;
  const name = muscleInfo(code)?.name ?? 'Músculo';

  const toggle = async (id: string) => {
    if (pick.isAdded(id)) {
      pick.remove(id);
      return;
    }
    try {
      const exercise: Exercise = await queryClient.fetchQuery({
        queryKey: ['exercise', id],
        queryFn: () => exerciseService.get(id),
      });
      pick.add(exercise);
    } catch (error) {
      notify.error(error);
    }
  };

  return (
    <View style={{ gap: spacing.md }}>
      <Text
        accessibilityRole="header"
        style={{
          color: colors.text,
          fontSize: fontSizes.xl,
          fontWeight: semibold,
        }}
      >
        {name}
      </Text>
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
          <Text
            style={{
              color: colors.textDisabled,
              fontSize: fontSizes.sm,
              fontWeight: semibold,
            }}
          >
            {total} {total === 1 ? 'ejercicio' : 'ejercicios'}
          </Text>
          <Card list>
            {items.map((exercise, index) => (
              <View key={exercise.id}>
                {index > 0 ? <Divider /> : null}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    minHeight: minTouchTarget,
                    paddingVertical: spacing.sm,
                  }}
                >
                  <PressableScale
                    accessibilityHint="Abre la ficha del ejercicio"
                    accessibilityLabel={exercise.nombre}
                    onPress={() => pick.onOpen(exercise.id)}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                    }}
                  >
                    <Thumb
                      label={exercise.imagen?.textoAlternativo ?? exercise.nombre}
                      uri={exercise.imagen?.url ?? null}
                    />
                    <Text
                      numberOfLines={2}
                      style={{
                        flex: 1,
                        color: colors.text,
                        fontSize: fontSizes.md,
                        fontWeight: semibold,
                      }}
                    >
                      {titleCase(exercise.nombre)}
                    </Text>
                  </PressableScale>
                  <PickButton
                    added={pick.isAdded(exercise.id)}
                    name={exercise.nombre}
                    onToggle={() => void toggle(exercise.id)}
                    testID={`pick-${exercise.id}`}
                  />
                </View>
              </View>
            ))}
          </Card>
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
    </View>
  );
}
