import { Ionicons } from '@expo/vector-icons';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native';
import type { Exercise } from '@gymsheet/types';
import { exerciseService, type ExerciseFilters } from '@/api/services';
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/feedback';
import { FilterChip } from '@/components/filter-chip';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { SearchRow, SEARCH_ROW_HEIGHT, type RowTrailing } from '@/features/exercise-search/search-row';
import {
  activeFilterCount,
  NO_FILTERS,
  resultCountLabel,
  type SearchFilters,
} from '@/features/exercise-search/search-text';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, spacing } from '@/theme';

const PAGE_SIZE = 30;
/** Lo que se espera tras la última tecla antes de preguntar al servidor. */
const DEBOUNCE_MS = 220;

/**
 * Los filtros rápidos. El valor es el texto que entiende el servidor
 * (`musculo` / `equipo`, sin acentos); la etiqueta es lo que se lee.
 * Comprobados contra el catálogo de TEST: todos devuelven ejercicios.
 */
const MUSCLES = [
  { label: 'Pecho', value: 'pecho' },
  { label: 'Espalda', value: 'espalda' },
  { label: 'Hombros', value: 'hombros' },
  { label: 'Bíceps', value: 'biceps' },
  { label: 'Tríceps', value: 'triceps' },
  { label: 'Piernas', value: 'piernas' },
  { label: 'Glúteos', value: 'gluteos' },
  { label: 'Abdomen', value: 'abdomen' },
] as const;

const EQUIPMENT = [
  { label: 'Mancuernas', value: 'mancuerna' },
  { label: 'Barra', value: 'barra' },
  { label: 'Máquina', value: 'maquina' },
  { label: 'Polea', value: 'polea' },
  { label: 'Banda', value: 'banda' },
  { label: 'Peso corporal', value: 'peso corporal' },
  { label: 'Kettlebell', value: 'kettlebell' },
] as const;

/**
 * Qué hace una fila según dónde viva el buscador:
 * - `browse`: Explorar ejercicios. Tocar abre la ficha.
 * - `pick`: asistente de rutinas. «+» añade o quita; tocar abre la ficha.
 * - `select`: «Añadir ejercicio» del entreno. Tocar (o «+») lo añade; `pendingId`
 *   es el que se está guardando.
 */
export type ExerciseSearchMode =
  | { kind: 'browse'; onOpen: (exerciseId: string) => void }
  | {
      kind: 'pick';
      isAdded: (exerciseId: string) => boolean;
      add: (exercise: Exercise) => void;
      remove: (exerciseId: string) => void;
      onOpen: (exerciseId: string) => void;
    }
  | { kind: 'select'; onSelect: (exerciseId: string) => void; pendingId?: string | null };

type Row =
  | { kind: 'heading'; key: string; title: string }
  | { kind: 'exercise'; key: string; exercise: Exercise };

export type ExerciseSearchProps = {
  mode: ExerciseSearchMode;
  /**
   * Lo que va encima del campo (volver, progreso, título). Se recoge mientras
   * se escribe: con el teclado abierto, la pantalla es para los resultados.
   */
  header?: ReactNode;
  /** Atajos bajo los filtros cuando aún no se ha buscado nada («Por músculo», «Crear ejercicio»). */
  shortcuts?: ReactNode;
  /** Muestra «Cancelar» junto al campo; para un buscador que se abre sobre otra pantalla. */
  onCancel?: () => void;
  autoFocus?: boolean;
  initialFilters?: Partial<SearchFilters>;
  /** Un filtro fijo que llega de fuera (un músculo elegido en la figura), con su etiqueta. */
  scope?: { label: string; filters: ExerciseFilters; onClear: () => void } | null;
  /** Deja ver el filtro «Favoritos» (solo donde tiene sentido). */
  favorites?: boolean;
  /** Márgenes: el buscador no sabe si vive en una pantalla o en una hoja. */
  padding: { top: number; bottom: number; left: number; right: number };
  /** Lo que, además de los datos, cambia el estado «añadido» de las filas. */
  extraData?: unknown;
  /** Sin resultados: una salida propia del sitio (crear el ejercicio que falta). */
  emptyAction?: ReactNode;
};

/**
 * El buscador de ejercicios, el mismo en el asistente de rutinas, en «Añadir
 * ejercicio» del entreno y en Explorar.
 *
 * - El campo queda fijo arriba; debajo, filtros combinables por músculo y equipo.
 * - Antes de escribir: recientes, los que más usa la persona y populares.
 * - Al escribir: resultados con tolerancia a erratas y sinónimos (lo resuelve el
 *   servidor), la petición de la tecla anterior se cancela y los resultados
 *   previos se quedan en pantalla mientras llega la respuesta.
 * - «¿Quisiste decir **sentadilla**?» cuando el servidor corrige la consulta.
 * - Lista virtualizada de filas de alto fijo con paginación infinita.
 */
export function ExerciseSearch({
  mode,
  header,
  shortcuts,
  onCancel,
  autoFocus = false,
  initialFilters,
  scope = null,
  favorites = false,
  padding,
  extraData,
  emptyAction,
}: ExerciseSearchProps) {
  const inputRef = useRef<TextInput | null>(null);
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({ ...NO_FILTERS, ...initialFilters });
  const query = useDebouncedValue(text.trim(), DEBOUNCE_MS);

  // Una letra suelta no es una búsqueda: el servidor devolvería medio catálogo.
  const searching = query.length >= 2;
  const filterCount = activeFilterCount(filters);
  const listing = searching || filterCount > 0 || scope !== null;

  const home = useQuery({
    queryKey: ['exercises', 'shortcuts'],
    queryFn: () => exerciseService.shortcuts(8),
    staleTime: 60_000,
    enabled: !listing,
    // Un servidor sin atajos (404) no merece tres reintentos con la pantalla en gris.
    retry: false,
  });
  // Sin atajos (servidor anterior o fallo): se enseña el catálogo por nombre.
  const fallbackListing = !listing && home.isError;

  const results = useInfiniteQuery({
    queryKey: ['exercises', 'search', query, filters, scope?.filters ?? null, fallbackListing],
    queryFn: ({ pageParam, signal }) =>
      exerciseService.search(
        {
          ...scope?.filters,
          search: searching ? query : undefined,
          musculo: filters.musculo ?? undefined,
          equipo: filters.equipo ?? undefined,
          conImagen: filters.conImagen || undefined,
          favoritos: filters.favoritos || undefined,
          page: pageParam,
          pageSize: PAGE_SIZE,
        },
        signal,
      ),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    enabled: listing || fallbackListing,
    placeholderData: keepPreviousData,
  });

  const showResults = listing || fallbackListing;
  const firstPage = results.data?.pages[0];
  const total = firstPage?.total ?? 0;
  const suggestion = searching ? (firstPage?.sugerencia ?? null) : null;

  const rows = useMemo<Row[]>(() => {
    if (showResults) {
      const seen = new Set<string>();
      const out: Row[] = [];
      for (const page of results.data?.pages ?? []) {
        for (const exercise of page.items) {
          // Si el catálogo cambia entre páginas, una fila puede repetirse.
          if (seen.has(exercise.id)) continue;
          seen.add(exercise.id);
          out.push({ kind: 'exercise', key: exercise.id, exercise });
        }
      }
      return out;
    }
    const data = home.data;
    if (!data) return [];
    const out: Row[] = [];
    const used = new Set<string>();
    const section = (id: string, title: string, list: readonly Exercise[]) => {
      const fresh = list.filter((exercise) => !used.has(exercise.id));
      if (fresh.length === 0) return;
      out.push({ kind: 'heading', key: `h-${id}`, title });
      for (const exercise of fresh) {
        used.add(exercise.id);
        out.push({ kind: 'exercise', key: `${id}-${exercise.id}`, exercise });
      }
    };
    section('recientes', 'Recientes', data.recientes);
    section('usados', 'Los que más usas', data.masUsados);
    section('populares', 'Populares', data.populares);
    return out;
  }, [home.data, results.data, showResults]);

  // Las filas son `memo`: reciben funciones estables que leen el modo vigente.
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const open = useCallback((exercise: Exercise) => {
    const current = modeRef.current;
    if (current.kind === 'select') current.onSelect(exercise.id);
    else current.onOpen(exercise.id);
  }, []);

  const add = useCallback((exercise: Exercise) => {
    const current = modeRef.current;
    if (current.kind === 'select') {
      // D6: mientras se guarda uno, otro toque no añade un segundo.
      if (current.pendingId) return;
      current.onSelect(exercise.id);
    } else if (current.kind === 'pick') {
      if (current.isAdded(exercise.id)) current.remove(exercise.id);
      else current.add(exercise);
    }
  }, []);

  const trailing: RowTrailing = mode.kind === 'browse' ? 'open' : mode.kind;
  const pendingId = mode.kind === 'select' ? (mode.pendingId ?? null) : null;

  const renderItem = useCallback<ListRenderItem<Row>>(
    ({ item }) => {
      if (item.kind === 'heading') {
        return (
          <View style={{ height: HEADING_HEIGHT, justifyContent: 'flex-end', paddingBottom: spacing.xs }}>
            <Text accessibilityRole="header" strong tone="secondary" variant="subhead">
              {item.title}
            </Text>
          </View>
        );
      }
      const current = modeRef.current;
      return (
        <SearchRow
          added={current.kind === 'pick' ? current.isAdded(item.exercise.id) : false}
          busy={pendingId === item.exercise.id}
          exercise={item.exercise}
          onAdd={add}
          onOpen={open}
          query={searching ? (suggestion ?? query) : ''}
          trailing={trailing}
        />
      );
    },
    [add, open, pendingId, query, searching, suggestion, trailing],
  );

  // Filas de alto conocido: la lista salta a cualquier punto sin medir nada.
  const layout = useMemo(() => {
    const offsets: number[] = [];
    let offset = 0;
    for (const row of rows) {
      offsets.push(offset);
      offset += (row.kind === 'heading' ? HEADING_HEIGHT : SEARCH_ROW_HEIGHT) + StyleSheet.hairlineWidth;
    }
    return offsets;
  }, [rows]);
  const getItemLayout = useCallback(
    (_: ArrayLike<Row> | null | undefined, index: number) => ({
      length: (rows[index]?.kind === 'heading' ? HEADING_HEIGHT : SEARCH_ROW_HEIGHT) + StyleSheet.hairlineWidth,
      offset: layout[index] ?? 0,
      index,
    }),
    [layout, rows],
  );

  const toggle = <K extends 'musculo' | 'equipo'>(key: K, value: string) =>
    setFilters((current) => ({ ...current, [key]: current[key] === value ? null : value }));
  const clearAll = () => {
    setText('');
    setFilters(NO_FILTERS);
    scope?.onClear();
  };

  // Con el teclado abierto o algo escrito, la cabecera cede el sitio a la lista.
  const compact = focused || text.length > 0;
  const loadingFirst = showResults ? results.isPending : home.isPending;
  const failed = showResults ? results.isError && rows.length === 0 : false;
  // Resultados anteriores a la vista mientras llega la respuesta de lo último tecleado.
  const stale = showResults && (results.isPlaceholderData || text.trim() !== query);

  const listHeader = (
    <View style={{ gap: spacing.sm, paddingBottom: spacing.xs }}>
      {!showResults && shortcuts ? <View style={{ gap: spacing.sm }}>{shortcuts}</View> : null}

      {suggestion ? (
        <PressableScale
          accessibilityHint="Deja la búsqueda corregida en el campo"
          accessibilityLabel={`¿Quisiste decir ${suggestion}?`}
          accessibilityRole="button"
          haptic="selection"
          onPress={() => setText(suggestion)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            minHeight: minTouchTarget,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderRadius: radii.md,
            borderCurve: 'continuous',
            backgroundColor: colors.surface,
          }}
          testID="search-suggestion"
        >
          <Ionicons
            accessibilityElementsHidden
            color={colors.accentInk}
            importantForAccessibility="no-hide-descendants"
            name="sparkles-outline"
            size={iconSizes.sm}
          />
          <View style={{ flex: 1 }}>
            <Text variant="subhead">
              ¿Quisiste decir{' '}
              <Text strong tone="accent" variant="subhead">
                {suggestion}
              </Text>
              ?
            </Text>
            <Text tone="muted" variant="footnote">
              Mostrando resultados de «{suggestion}» en lugar de «{query}».
            </Text>
          </View>
        </PressableScale>
      ) : null}

      {showResults && !loadingFirst && !failed && rows.length > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 24 }}>
          <Text style={{ flex: 1 }} tone="muted" variant="footnote">
            {resultCountLabel(total)}
          </Text>
          {stale ? <ActivityIndicator color={colors.textMuted} size="small" /> : null}
        </View>
      ) : null}
    </View>
  );

  const empty = loadingFirst ? (
    <RowsSkeleton rows={6} thumb={56} />
  ) : failed ? (
    <ErrorState error={results.error} onRetry={() => void results.refetch()} />
  ) : showResults ? (
    <EmptyState
      icon="search-outline"
      message={
        searching
          ? filterCount > 0 || scope
            ? `Nada coincide con «${query}» con estos filtros. Prueba a quitarlos.`
            : `Nada coincide con «${query}». Prueba con otro nombre, el músculo o el equipo.`
          : filters.favoritos
            ? 'Marca un ejercicio con ☆ en su ficha y aparecerá aquí.'
            : 'Ningún ejercicio cumple estos filtros a la vez.'
      }
      title={filters.favoritos && !searching ? 'Aún no tienes favoritos' : 'Sin resultados'}
    >
      {filterCount > 0 || scope ? (
        <Button icon="close-circle-outline" label="Borrar filtros" onPress={clearAll} size="sm" variant="secondary" />
      ) : null}
      {emptyAction}
    </EmptyState>
  ) : (
    // Sin atajos todavía (cuenta nueva y catálogo sin populares): no es un error.
    <EmptyState
      icon="search-outline"
      message="Escribe el nombre, el músculo o el equipo. No hace falta que esté bien escrito."
      title="Busca un ejercicio"
    />
  );

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          paddingTop: padding.top,
          paddingLeft: padding.left,
          paddingRight: padding.right,
          gap: spacing.sm,
          paddingBottom: spacing.sm,
        }}
      >
        {header && !compact ? <View style={{ gap: spacing.md, paddingBottom: spacing.xs }}>{header}</View> : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: 48,
              borderRadius: radii.lg,
              borderCurve: 'continuous',
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: focused ? colors.accentInk : colors.borderSubtle,
              paddingLeft: spacing.md,
            }}
          >
            <Ionicons
              accessibilityElementsHidden
              color={focused ? colors.accentInk : colors.textMuted}
              importantForAccessibility="no-hide-descendants"
              name="search"
              size={iconSizes.md}
            />
            <TextInput
              accessibilityLabel="Buscar ejercicios"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus={autoFocus}
              keyboardAppearance="dark"
              onBlur={() => setFocused(false)}
              onChangeText={setText}
              onFocus={() => setFocused(true)}
              placeholder="Nombre, músculo o equipo"
              placeholderTextColor={colors.textMuted}
              ref={inputRef}
              returnKeyType="search"
              style={{
                flex: 1,
                minHeight: 48,
                paddingHorizontal: spacing.sm,
                color: colors.text,
                fontSize: fontSizes.md,
              }}
              testID="exercise-search"
              value={text}
            />
            {text.length > 0 ? (
              <PressableScale
                accessibilityLabel="Borrar la búsqueda"
                accessibilityRole="button"
                haptic="none"
                onPress={() => {
                  setText('');
                  inputRef.current?.focus();
                }}
                scaleTo={0.9}
                style={{ width: minTouchTarget, height: 48, alignItems: 'center', justifyContent: 'center' }}
                testID="exercise-search-clear"
              >
                <Ionicons
                  accessibilityElementsHidden
                  color={colors.textMuted}
                  importantForAccessibility="no-hide-descendants"
                  name="close-circle"
                  size={iconSizes.md}
                />
              </PressableScale>
            ) : null}
          </View>
          {onCancel || compact ? (
            <PressableScale
              accessibilityLabel={onCancel ? 'Cancelar la búsqueda' : 'Cerrar el teclado'}
              accessibilityRole="button"
              haptic="none"
              hitSlop={spacing.sm}
              onPress={() => {
                if (onCancel) {
                  onCancel();
                  return;
                }
                setText('');
                inputRef.current?.blur();
              }}
              style={{ minHeight: minTouchTarget, justifyContent: 'center' }}
              testID="exercise-search-cancel"
            >
              <Text tone="secondary" variant="subhead">
                Cancelar
              </Text>
            </PressableScale>
          ) : null}
        </View>

        <ScrollView
          contentContainerStyle={{ gap: spacing.sm, alignItems: 'center', paddingRight: padding.right }}
          horizontal
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          // A sangre por la derecha: el último chip asoma y se entiende que hay más.
          style={{ marginRight: -padding.right, flexGrow: 0 }}
        >
          {scope ? (
            <FilterChip
              accessibilityLabel={`${scope.label}. Toca para quitar el filtro`}
              label={scope.label}
              onPress={scope.onClear}
              selected
            />
          ) : null}
          {favorites ? (
            <FilterChip
              icon="star-outline"
              label="Favoritos"
              onPress={() => setFilters((current) => ({ ...current, favoritos: !current.favoritos }))}
              selected={filters.favoritos}
              testID="filter-favorites"
            />
          ) : null}
          {scope
            ? null
            : MUSCLES.map((muscle) => (
                <FilterChip
                  key={muscle.value}
                  label={muscle.label}
                  onPress={() => toggle('musculo', muscle.value)}
                  selected={filters.musculo === muscle.value}
                  testID={`filter-musculo-${muscle.value}`}
                />
              ))}
          <View style={{ width: StyleSheet.hairlineWidth, height: 20, backgroundColor: colors.border }} />
          {EQUIPMENT.map((equipment) => (
            <FilterChip
              key={equipment.value}
              label={equipment.label}
              onPress={() => toggle('equipo', equipment.value)}
              selected={filters.equipo === equipment.value}
              testID={`filter-equipo-${equipment.value.replace(' ', '-')}`}
            />
          ))}
          <View style={{ width: StyleSheet.hairlineWidth, height: 20, backgroundColor: colors.border }} />
          <FilterChip
            icon="image-outline"
            label="Con imagen"
            onPress={() => setFilters((current) => ({ ...current, conImagen: !current.conImagen }))}
            selected={filters.conImagen}
            testID="filter-con-imagen"
          />
        </ScrollView>
      </View>

      <FlatList<Row>
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{
          paddingLeft: padding.left,
          paddingRight: padding.right,
          paddingBottom: padding.bottom,
          flexGrow: 1,
        }}
        data={rows}
        extraData={extraData}
        getItemLayout={getItemLayout}
        initialNumToRender={10}
        ItemSeparatorComponent={RowSeparator}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={keyOf}
        ListEmptyComponent={empty}
        ListFooterComponent={
          showResults && results.isFetchingNextPage ? (
            <View style={{ paddingVertical: spacing.md }}>
              <ActivityIndicator color={colors.textMuted} />
            </View>
          ) : null
        }
        ListHeaderComponent={listHeader}
        maxToRenderPerBatch={10}
        onEndReached={() => {
          if (showResults && results.hasNextPage && !results.isFetchingNextPage) void results.fetchNextPage();
        }}
        onEndReachedThreshold={0.6}
        removeClippedSubviews
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        // Los resultados de la búsqueda anterior se apagan un poco mientras
        // llega la nueva: se ve que la lista va a cambiar, sin vaciarla.
        style={{ opacity: stale ? 0.6 : 1 }}
        testID="exercise-search-list"
        windowSize={7}
      />
    </View>
  );
}

const HEADING_HEIGHT = 44;

function keyOf(row: Row): string {
  return row.key;
}

function RowSeparator() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSubtle }} />;
}
