import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Divider, ScreenChrome, ScrollScreen, Section, useScreenFrame } from '@/components/layout';
import { ErrorState, Skeleton } from '@/components/feedback';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { TourTarget } from '@/components/tour';
import { bodyPartLabelEs, muscleLabelEs } from '@gymsheet/domain';
import { DrillBack, Grid, GridTile, iconFor } from '@/components/catalogue-grid';
import { BodyMap, musclesByGroup } from '@/features/body-map';
import { ExerciseSearch, type ExerciseSearchMode } from '@/features/exercise-search/exercise-search';
import { MusclePickList } from '@/features/exercise-browser/muscle-pick-list';
import type { PickConfig } from '@/features/exercise-browser/types';
import { exerciseService } from '@/api/services';
import { NavRow } from '@/components/list';
import { colors, iconSizes, minTouchTarget, radii, spacing } from '@/theme';
import { routes } from '@/lib/routes';

/** Alto reservado al final de la lista para que la barra inferior del selector no la tape. */
const PICK_BAR_CLEARANCE = 128;

/**
 * El catálogo de ejercicios, con dos vistas:
 * - **buscar** (`ExerciseSearch`): campo fijo, filtros, recientes/populares y
 *   resultados con «¿Quisiste decir…?» en una lista virtualizada. En el
 *   asistente es la vista de entrada: se viene a elegir ejercicios.
 * - **explorar**: la figura muscular y las zonas, para quien prefiere apuntar
 *   con el dedo. Elegir un músculo de una zona vuelve a la lista de búsqueda
 *   con ese músculo como filtro.
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
  const frame = useScreenFrame();
  const pick = props.mode === 'pick' ? props.pick : null;
  const picking = pick !== null;
  // En el asistente se entra buscando; en Explorar, por la figura (salvo que se
  // venga a ver los favoritos, que son una lista).
  const [view, setView] = useState<'search' | 'explore'>(picking || initialFavorites ? 'search' : 'explore');
  /** Si se llegó a buscar tocando el campo de la vista de exploración: se abre con el teclado. */
  const [typing, setTyping] = useState(false);
  /** La búsqueda se abre con el filtro ☆ puesto (Perfil → favoritos, o el acceso de esta pantalla). */
  const [favoritesFirst, setFavoritesFirst] = useState(initialFavorites);
  /** Drill-down position. `null` at a level means "not chosen yet". */
  const [bodyPart, setBodyPart] = useState<string | null>(null);
  const [muscle, setMuscle] = useState<string | null>(null);
  /** En modo selector, el músculo tocado en la figura se abre en línea. */
  const [muscleCode, setMuscleCode] = useState<string | null>(null);
  const [showMuscleList, setShowMuscleList] = useState(false);

  const taxonomy = useQuery({
    queryKey: ['exercises', 'taxonomy'],
    queryFn: () => exerciseService.taxonomy(),
    // The catalogue's shape barely changes; refetching it on every visit would
    // cost a round trip to redraw the same grid.
    staleTime: 30 * 60 * 1000,
    enabled: view === 'explore',
  });

  const groups = taxonomy.data ?? [];
  const currentGroup = groups.find((group) => group.bodyPart === bodyPart) ?? null;

  const searchMode = useMemo<ExerciseSearchMode>(
    () =>
      pick
        ? { kind: 'pick', isAdded: pick.isAdded, add: pick.add, remove: pick.remove, onOpen: pick.onOpen }
        : { kind: 'browse', onOpen: (id) => router.push(routes.exercise(id)) },
    [pick, router],
  );

  // El músculo elegido en una zona: la lista de búsqueda con ese filtro puesto.
  const scope = useMemo(
    () =>
      muscle
        ? {
            label: muscleLabelEs(muscle),
            filters: { bodyPart: bodyPart ?? undefined, targetMuscle: muscle },
            onClear: () => {
              setMuscle(null);
              setView('explore');
            },
          }
        : null,
    [bodyPart, muscle],
  );

  // ── Un músculo de la figura, dentro del asistente ────────────────────────
  if (muscleCode && pick) {
    return (
      <MusclePickList
        bottomSpace={overlay ? PICK_BAR_CLEARANCE : 0}
        code={muscleCode}
        header={
          <>
            {header('Elige los ejercicios del músculo')}
            <DrillBack label="Todos los músculos" onPress={() => setMuscleCode(null)} />
          </>
        }
        overlay={overlay}
        pick={pick}
      />
    );
  }

  // ── Buscar ───────────────────────────────────────────────────────────────
  if (view === 'search') {
    const leaveSearch = () => {
      setTyping(false);
      setFavoritesFirst(false);
      setMuscle(null);
      setView('explore');
    };
    return (
      <ScreenChrome frame={frame} overlay={overlay}>
        <ExerciseSearch
          autoFocus={typing}
          emptyAction={
            picking ? null : (
              <Button
                icon="add-circle-outline"
                label="Crear un ejercicio propio"
                onPress={() => router.push('/ejercicio-nuevo')}
                size="sm"
                variant="ghost"
              />
            )
          }
          // `pick` cambia con cada alta: es lo que mueve el «añadido» de las filas.
          extraData={pick}
          favorites={!picking}
          header={header(
            scope
              ? [scope.label, bodyPartLabelEs(bodyPart)].filter(Boolean).join(' · ')
              : picking
                ? 'Busca por nombre, músculo o equipo'
                : 'Todo el catálogo',
          )}
          initialFilters={favoritesFirst ? { favoritos: true } : undefined}
          mode={searchMode}
          // En Explorar se llega aquí desde la figura: «Cancelar» vuelve a ella.
          onCancel={picking ? undefined : leaveSearch}
          padding={{
            top: Number(frame.contentPadding.paddingTop ?? 0),
            bottom: Number(frame.contentPadding.paddingBottom ?? 0) + (overlay ? PICK_BAR_CLEARANCE : 0),
            left: Number(frame.contentPadding.paddingLeft ?? 0),
            right: Number(frame.contentPadding.paddingRight ?? 0),
          }}
          scope={scope}
          shortcuts={
            picking ? (
              <ShortcutRow
                icon="body-outline"
                label="Elegir por músculo"
                onPress={leaveSearch}
                subtitle="Toca la zona en la figura"
                testID="pick-by-muscle"
              />
            ) : null
          }
        />
      </ScreenChrome>
    );
  }

  // ── Explorar: la figura y las zonas ──────────────────────────────────────
  const subtitle = bodyPart ? bodyPartLabelEs(bodyPart) : 'Toca un músculo o elige una zona';
  const showFigure = !bodyPart;

  return (
    <ScrollScreen
      onRefresh={() => void taxonomy.refetch()}
      overlay={overlay}
      refreshing={taxonomy.isFetching && !taxonomy.isPending}
    >
      {header(subtitle)}

      {/* El campo no es un campo: es la puerta a la vista de búsqueda, que es
          donde viven el teclado, los filtros y la lista. */}
      <TourTarget id="exercises.search">
        <PressableScale
          accessibilityHint="Abre el buscador de ejercicios"
          accessibilityLabel="Buscar ejercicios"
          accessibilityRole="search"
          haptic="selection"
          onPress={() => {
            setTyping(true);
            setView('search');
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            minHeight: 48,
            paddingHorizontal: spacing.md,
            borderRadius: radii.lg,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            backgroundColor: colors.surface,
          }}
          testID="exercise-search-open"
        >
          <Ionicons
            accessibilityElementsHidden
            color={colors.textMuted}
            importantForAccessibility="no-hide-descendants"
            name="search"
            size={iconSizes.md}
          />
          <Text tone="muted">Nombre, músculo o equipo</Text>
        </PressableScale>
      </TourTarget>

      {picking ? null : (
        <ShortcutRow
          icon="star-outline"
          label="Mis favoritos"
          onPress={() => {
            setFavoritesFirst(true);
            setTyping(false);
            setView('search');
          }}
          testID="filter-favorites"
        />
      )}

      {/* NIVEL 0 — la figura. Tocar un músculo lleva directo a su pantalla, sin
          pasar por la zona ni por la lista: es el camino más corto a «qué
          entreno para este músculo». */}
      {showFigure ? (
        <TourTarget id="exercises.grid">
          <BodyMap
            onOpenList={() =>
              picking ? setShowMuscleList((current) => !current) : router.push(routes.muscles())
            }
            onSelectMuscle={(code) => (picking ? setMuscleCode(code) : router.push(routes.muscle(code)))}
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
          su propio ejercicio ya sabe que no está en la lista. */}
      {picking ? null : (
        <Button
          icon="add-circle-outline"
          label="Crear un ejercicio propio"
          onPress={() => router.push('/ejercicio-nuevo')}
          variant="ghost"
        />
      )}

      {bodyPart ? <DrillBack label="Todas las zonas" onPress={() => setBodyPart(null)} /> : null}

      {/* NIVEL 1 — zonas del cuerpo. Sigue ahí para quien prefiere recorrer por
          zona y músculo en vez de apuntar con el dedo. */}
      {!bodyPart ? (
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
                  imageUrl={group.imageUrl}
                  index={index}
                  key={group.bodyPart}
                  label={bodyPartLabelEs(group.bodyPart)}
                  onPress={() => setBodyPart(group.bodyPart)}
                  total={group.total}
                  zone={group.bodyPart}
                />
              ))}
            </Grid>
          )}
        </Section>
      ) : (
        /* NIVEL 2 — músculos de la zona. Elegir uno abre la lista con ese filtro. */
        <Grid>
          {(currentGroup?.muscles ?? []).map((entry, index) => (
            <GridTile
              icon={iconFor(bodyPart)}
              imageUrl={entry.imageUrl}
              index={index}
              key={entry.targetMuscle}
              label={muscleLabelEs(entry.targetMuscle)}
              onPress={() => {
                setMuscle(entry.targetMuscle);
                setTyping(false);
                setView('search');
              }}
              total={entry.total}
              zone={entry.targetMuscle}
            />
          ))}
        </Grid>
      )}

      {picking ? <View style={{ height: PICK_BAR_CLEARANCE }} /> : null}
    </ScrollScreen>
  );
}

/** Una fila de acceso: icono, texto y flecha. 48 de alto. */
function ShortcutRow({
  icon,
  label,
  subtitle,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <PressableScale
      accessibilityLabel={subtitle ? `${label}. ${subtitle}` : label}
      accessibilityRole="button"
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: Math.max(48, minTouchTarget),
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceLow,
      }}
      testID={testID}
    >
      <Ionicons
        accessibilityElementsHidden
        color={colors.accentInk}
        importantForAccessibility="no-hide-descendants"
        name={icon}
        size={iconSizes.md}
      />
      <View style={{ flex: 1 }}>
        <Text variant="headline">{label}</Text>
        {subtitle ? (
          <Text tone="muted" variant="footnote">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons
        accessibilityElementsHidden
        color={colors.textMuted}
        importantForAccessibility="no-hide-descendants"
        name="chevron-forward"
        size={iconSizes.md}
      />
    </PressableScale>
  );
}
