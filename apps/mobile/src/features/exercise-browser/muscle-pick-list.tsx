import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import type { Exercise } from '@gymsheet/types';
import { exerciseService, muscleService } from '@/api/services';
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/feedback';
import { Divider, ListScreen } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { titleCase } from '@/components/catalogue-grid';
import { notify } from '@/notifications';
import { muscleInfo } from '@/features/body-map';
import { PickButton } from '@/features/exercise-browser/exercise-row';
import type { PickConfig } from '@/features/exercise-browser/types';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';
import type { MuscleExercise } from '@gymsheet/schemas';

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

const PickRow = memo(function PickRow({
  id,
  name,
  image,
  imageLabel,
  first,
  added,
  busy,
  onOpen,
  onToggle,
}: {
  id: string;
  name: string;
  image: string | null;
  imageLabel: string;
  first: boolean;
  added: boolean;
  busy: boolean;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  return (
    <View>
      {first ? null : <Divider />}
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
          accessibilityLabel={name}
          onPress={() => onOpen(id)}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
        >
          <Thumb label={imageLabel} uri={image} />
          <Text numberOfLines={2} style={{ flex: 1, color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
            {titleCase(name)}
          </Text>
        </PressableScale>
        {busy ? (
          <View
            accessibilityLabel={`Añadiendo ${name}`}
            accessible
            style={{ width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center' }}
          >
            <ActivityIndicator color={colors.volt} />
          </View>
        ) : (
          <PickButton added={added} name={name} onToggle={() => onToggle(id)} testID={`pick-${id}`} />
        )}
      </View>
    </View>
  );
});

/**
 * Ejercicios de un músculo dentro del selector del asistente, a pantalla
 * completa. Es la versión en línea de la pantalla de músculo: el asistente
 * tiene que seguir en su propia pila (con su barra de progreso y su botón
 * Atrás), así que no puede saltar a otra ruta.
 *
 * La lista ES el desplazamiento (`ListScreen`): antes eran hasta 300 filas
 * dentro de un `ScrollView`, todas montadas a la vez, con un botón «Ver más».
 * Ahora solo existen las filas a la vista y las páginas llegan al acercarse al final.
 *
 * Esta lista no trae el grupo muscular de cada ejercicio, que el asistente
 * necesita para sus avisos: al añadir se pide la ficha completa.
 */
export function MusclePickList({
  code,
  pick,
  header,
  overlay,
  bottomSpace,
}: {
  code: string;
  pick: PickConfig;
  /** Volver, progreso y título del asistente: viaja con la lista. */
  header: ReactNode;
  overlay?: ReactNode;
  bottomSpace?: number;
}) {
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

  // Las filas son `memo` y reciben funciones estables: `pick` cambia de
  // identidad en cada alta (depende de la lista elegida) y, sin esto, un «+»
  // volvía a pintar todas las filas montadas (90 de 90 con tres páginas).
  const pickRef = useRef(pick);
  useEffect(() => {
    pickRef.current = pick;
  }, [pick]);
  // Altas en vuelo: la ficha se pide al servidor antes de añadir; mientras
  // tanto la fila gira y un segundo toque no cuenta (antes añadía y quitaba).
  const [busy, setBusy] = useState<ReadonlySet<string>>(() => new Set());
  const inFlight = useRef(new Set<string>());

  const open = useCallback((id: string) => pickRef.current.onOpen(id), []);
  const toggle = useCallback(
    async (id: string) => {
      if (inFlight.current.has(id)) return;
      if (pickRef.current.isAdded(id)) {
        pickRef.current.remove(id);
        return;
      }
      inFlight.current.add(id);
      setBusy(new Set(inFlight.current));
      try {
        const exercise: Exercise = await queryClient.fetchQuery({
          queryKey: ['exercise', id],
          queryFn: () => exerciseService.get(id),
          staleTime: 5 * 60_000,
        });
        pickRef.current.add(exercise);
      } catch (error) {
        notify.error(error);
      } finally {
        inFlight.current.delete(id);
        setBusy(new Set(inFlight.current));
      }
    },
    [queryClient],
  );

  return (
    <ListScreen<MuscleExercise>
      bottomSpace={bottomSpace}
      data={items}
      empty={
        exercises.isPending ? (
          <RowsSkeleton />
        ) : exercises.isError ? (
          <ErrorState error={exercises.error} onRetry={() => void exercises.refetch()} />
        ) : (
          <EmptyState
            icon="barbell-outline"
            message="Todavía no hay ejercicios registrados para este músculo."
            title="Sin ejercicios"
          />
        )
      }
      // `pick` decide qué filas salen como «añadidas» y `busy` cuáles giran.
      extraData={[pick, busy]}
      footer={exercises.isFetchingNextPage ? <ActivityIndicator color={colors.textMuted} /> : undefined}
      header={
        <>
          {header}
          <View style={{ gap: spacing.xs }}>
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
            {items.length > 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
                {total} {total === 1 ? 'ejercicio' : 'ejercicios'}
              </Text>
            ) : null}
          </View>
        </>
      }
      keyExtractor={(exercise) => exercise.id}
      onEndReached={() => {
        if (exercises.hasNextPage && !exercises.isFetchingNextPage) void exercises.fetchNextPage();
      }}
      overlay={overlay}
      renderItem={({ item, index }) => (
        <PickRow
          added={pick.isAdded(item.id)}
          busy={busy.has(item.id)}
          first={index === 0}
          id={item.id}
          image={item.imagen?.url ?? null}
          imageLabel={item.imagen?.textoAlternativo ?? item.nombre}
          name={item.nombre}
          onOpen={open}
          onToggle={toggle}
        />
      )}
    />
  );
}
