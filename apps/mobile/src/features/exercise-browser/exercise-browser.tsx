import { useState, type ReactNode } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Card, Divider, ScrollScreen, Section } from '@/components/layout';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { Button, Input } from '@/components/ui';
import { TourTarget } from '@/components/tour';
import { bodyPartLabelEs, muscleLabelEs } from '@gymsheet/domain';
import { DrillBack, Grid, GridTile, iconFor } from '@/components/catalogue-grid';
import { ChoiceChip } from '@/components/wizard/choice-chip';
import { BodyMap, musclesByGroup } from '@/features/body-map';
import { ExerciseRow } from '@/features/exercise-browser/exercise-row';
import { MusclePickList } from '@/features/exercise-browser/muscle-pick-list';
import type { PickConfig } from '@/features/exercise-browser/types';
import { exerciseService } from '@/api/services';
import { NavRow } from '@/components/list';
import { spacing } from '@/theme';
import { routes } from '@/lib/routes';

/** Alto reservado al final de la lista para que la barra inferior del selector no la tape. */
const PICK_BAR_CLEARANCE = 128;

/**
 * El buscador de ejercicios: figura muscular, buscador, zonas y lista.
 *
 * Tiene dos modos con la misma cara:
 * - `browse`: la pantalla `/ejercicios` (antes pestaña). Tocar una fila abre la
 *   ficha y tocar un músculo abre su pantalla en la misma pila.
 * - `pick`: el selector del asistente de rutinas. Cada fila gana un «+» y todo
 *   queda dentro de la pila del asistente (el músculo se abre en línea, la fila
 *   abre la ficha con «Añadir a la rutina»).
 *
 * `header` recibe el subtítulo que depende de dónde esté el recorrido, y
 * `overlay` es la barra fija inferior del modo `pick`.
 */
export type ExerciseBrowserProps = {
  header: (subtitle: string) => ReactNode;
  overlay?: ReactNode;
  /**
   * Abre con el filtro ☆ puesto. Es lo que pide Perfil → «Mis ejercicios y
   * favoritos» (`routes.exerciseFavorites()`); la persona puede quitarlo con el
   * mismo chip y seguir explorando.
   */
  initialFavorites?: boolean;
} & ({ mode: 'browse' } | { mode: 'pick'; pick: PickConfig });

export function ExerciseBrowser(props: ExerciseBrowserProps) {
  const { header, overlay, initialFavorites = false } = props;
  const router = useRouter();
  const pick = props.mode === 'pick' ? props.pick : null;
  const picking = pick !== null;
  const [search, setSearch] = useState('');
  /** Drill-down position. `null` at a level means "not chosen yet". */
  const [bodyPart, setBodyPart] = useState<string | null>(null);
  const [muscle, setMuscle] = useState<string | null>(null);
  /** En modo selector, el músculo tocado en la figura se abre en línea. */
  const [muscleCode, setMuscleCode] = useState<string | null>(null);
  const [showMuscleList, setShowMuscleList] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(initialFavorites);

  const taxonomy = useQuery({
    queryKey: ['exercises', 'taxonomy'],
    queryFn: () => exerciseService.taxonomy(),
    // The catalogue's shape barely changes; refetching it on every visit would
    // cost a round trip to redraw the same grid.
    staleTime: 30 * 60 * 1000,
  });

  // Searching cuts across the whole catalogue: someone typing a name does not
  // want to be told it is not in the muscle they happen to be browsing.
  const searching = search.trim().length > 0;
  const browsing = searching || Boolean(muscle) || onlyFavorites;

  const exercises = useQuery({
    queryKey: ['exercises', search, bodyPart, muscle, onlyFavorites],
    queryFn: () =>
      exerciseService.list({
        search: search.trim() || undefined,
        bodyPart: searching || onlyFavorites ? undefined : (bodyPart ?? undefined),
        targetMuscle: searching || onlyFavorites ? undefined : (muscle ?? undefined),
        favoritos: onlyFavorites || undefined,
        pageSize: 50,
      }),
    // Only fetch once there is something to list; the grids need no exercises.
    enabled: browsing,
    placeholderData: keepPreviousData,
  });

  const items = exercises.data?.items ?? [];
  const groups = taxonomy.data ?? [];
  const currentGroup = groups.find((group) => group.bodyPart === bodyPart) ?? null;

  const subtitle = muscleCode
    ? 'Elige los ejercicios del músculo'
    : onlyFavorites
      ? 'Tus favoritos'
      : searching
        ? 'Buscando en todo el catálogo'
        : muscle
          ? [muscleLabelEs(muscle), bodyPartLabelEs(bodyPart)].filter(Boolean).join(' · ')
          : bodyPart
            ? bodyPartLabelEs(bodyPart)
            : 'Toca un músculo o elige una zona';

  const searchBlock = (
    <>
      <TourTarget id="exercises.search">
        <Input
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          icon="search"
          label="Buscar ejercicios"
          labelHidden
          onChangeText={setSearch}
          placeholder="Nombre, grupo muscular…"
          returnKeyType="search"
          testID="exercise-search"
          value={search}
        />
      </TourTarget>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <ChoiceChip
          accessibilityLabel={onlyFavorites ? 'Favoritos, activado' : 'Favoritos'}
          label="☆ Favoritos"
          onSelect={() => setOnlyFavorites((current) => !current)}
          selected={onlyFavorites}
          testID="filter-favorites"
        />
      </View>
    </>
  );

  const showFigure = !searching && !bodyPart && !onlyFavorites && !muscleCode;

  return (
    <ScrollScreen
      onRefresh={() => {
        void taxonomy.refetch();
        if (browsing) void exercises.refetch();
      }}
      overlay={overlay}
      refreshing={taxonomy.isFetching || exercises.isFetching}
    >
      {header(subtitle)}

      {muscleCode && pick ? (
        <>
          <DrillBack
            label="Todos los músculos"
            onPress={() => {
              setMuscleCode(null);
            }}
          />
          <MusclePickList code={muscleCode} pick={pick} />
        </>
      ) : (
        <>
          {/* En el selector la búsqueda va primero: se viene a elegir ejercicios, y la
              figura —alta— empujaba el campo fuera de la pantalla. */}
          {picking ? searchBlock : null}

          {/* NIVEL 0 — la figura. Tocar un músculo lleva directo a su pantalla, sin
              pasar por la zona ni por la lista: es el camino más corto a «qué
              entreno para este músculo». */}
          {showFigure ? (
            <TourTarget id="exercises.grid">
              <BodyMap
                onOpenList={() =>
                  picking
                    ? setShowMuscleList((current) => !current)
                    : router.push(routes.muscles())
                }
                onSelectMuscle={(code) =>
                  picking
                    ? setMuscleCode(code)
                    : router.push(routes.muscle(code))
                }
              />
            </TourTarget>
          ) : null}

          {/* La lista de músculos del selector: la alternativa accesible a la figura. */}
          {picking && showFigure && showMuscleList
            ? musclesByGroup().map(({ group, muscles }, index) => (
                <Section index={index} key={group.code} title={group.name}>
                  <Card list>
                    {muscles.map((entry, rowIndex) => (
                      <View key={entry.code}>
                        {rowIndex > 0 ? <Divider /> : null}
                        <NavRow
                          onPress={() => setMuscleCode(entry.code)}
                          subtitle={entry.latinName}
                          title={entry.name}
                        />
                      </View>
                    ))}
                  </Card>
                </Section>
              ))
            : null}

          {/* Crear va arriba y no escondido tras el catálogo: quien viene a añadir
              su propio ejercicio ya sabe que no está en la lista, y hacerle
              recorrer 1.300 fichas antes de ofrecerle el botón es hacerle perder
              el tiempo para confirmar algo que ya sabía. */}
          {picking ? null : (
            <Button
              icon="add-circle-outline"
              label="Crear un ejercicio propio"
              onPress={() => router.push('/ejercicio-nuevo')}
              variant="ghost"
            />
          )}

          {picking ? null : searchBlock}

          {/* Breadcrumb: one step back at a time, so the user can widen the filter
              without losing the zone they were exploring. */}
          {!searching && !onlyFavorites && muscle ? (
            <DrillBack label={bodyPartLabelEs(bodyPart)} onPress={() => setMuscle(null)} />
          ) : null}
          {!searching && !onlyFavorites && bodyPart && !muscle ? (
            <DrillBack label="Todas las zonas" onPress={() => setBodyPart(null)} />
          ) : null}

          {/* NIVEL 1 — zonas del cuerpo. Sigue ahí para quien prefiere recorrer por
              zona y músculo en vez de apuntar con el dedo. */}
          {!searching && !onlyFavorites && !bodyPart ? (
            <Section index={1} title="Por zona">
              {taxonomy.isPending ? (
                <View style={{ gap: spacing.sm }}>
                  <Skeleton height={116} />
                  <Skeleton height={116} />
                </View>
              ) : taxonomy.isError ? (
                <ErrorState error={taxonomy.error} onRetry={() => void taxonomy.refetch()} />
              ) : (
                <Grid>
                  {groups.map((group, index) => (
                    <GridTile
                      icon={iconFor(group.bodyPart)}
                      index={index}
                      key={group.bodyPart}
                      imageUrl={group.imageUrl}
                      label={bodyPartLabelEs(group.bodyPart)}
                      onPress={() => setBodyPart(group.bodyPart)}
                      total={group.total}
                    />
                  ))}
                </Grid>
              )}
            </Section>
          ) : null}

          {/* LEVEL 2 — muscles inside the chosen body part */}
          {!searching && !onlyFavorites && bodyPart && !muscle ? (
            <Grid>
              {(currentGroup?.muscles ?? []).map((entry, index) => (
                <GridTile
                  icon={iconFor(bodyPart)}
                  index={index}
                  key={entry.targetMuscle}
                  imageUrl={entry.imageUrl}
                  label={muscleLabelEs(entry.targetMuscle)}
                  onPress={() => setMuscle(entry.targetMuscle)}
                  total={entry.total}
                />
              ))}
            </Grid>
          ) : null}

          {/* LEVEL 3 — the exercises themselves */}
          {browsing ? (
            exercises.isPending ? (
              <View style={{ gap: spacing.sm }}>
                <Skeleton height={72} />
                <Skeleton height={72} />
                <Skeleton height={72} />
              </View>
            ) : exercises.isError ? (
              <ErrorState error={exercises.error} onRetry={() => void exercises.refetch()} />
            ) : items.length === 0 ? (
              <EmptyState
                icon={onlyFavorites ? 'star-outline' : 'search-outline'}
                message={
                  onlyFavorites
                    ? 'Marca un ejercicio con ☆ en su ficha y aparecerá aquí.'
                    : searching
                      ? `Ningún ejercicio coincide con «${search}».`
                      : 'No hay ejercicios registrados para este músculo.'
                }
                title={onlyFavorites ? 'Aún no tienes favoritos' : 'Sin resultados'}
              />
            ) : (
              <Card list>
                {items.map((exercise, index) => (
                  <View key={exercise.id}>
                    {index > 0 ? <Divider /> : null}
                    <ExerciseRow
                      exercise={exercise}
                      onPress={() =>
                        picking
                          ? pick?.onOpen(exercise.id)
                          : router.push(routes.exercise(exercise.id))
                      }
                      pick={
                        picking
                          ? {
                              added: pick.isAdded(exercise.id),
                              onToggle: () =>
                                pick.isAdded(exercise.id)
                                  ? pick.remove(exercise.id)
                                  : pick.add(exercise),
                            }
                          : undefined
                      }
                    />
                  </View>
                ))}
              </Card>
            )
          ) : null}
        </>
      )}
      {picking ? <View style={{ height: PICK_BAR_CLEARANCE }} /> : null}
    </ScrollScreen>
  );
}
