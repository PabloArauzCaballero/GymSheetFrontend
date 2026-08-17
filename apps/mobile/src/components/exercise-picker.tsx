import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { exerciseService } from '@/api/services';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { Divider } from '@/components/layout';
import { NavRow } from '@/components/list';
import { ExerciseImage } from '@/components/media';
import { Input } from '@/components/ui';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, spacing } from '@/theme';

/** How much of the screen the sheet claims: enough rows to scan, still clearly a sheet. */
const SHEET_HEIGHT = '85%';

/** One page is plenty for a picker — the search box, not scrolling, narrows 1300+ rows. */
const PAGE_SIZE = 30;

/**
 * Catalogue search in a bottom sheet, used to add an exercise to a session in
 * progress. It only picks: the caller owns the mutation and reports it back
 * through `pending`, so the sheet can stay open (and inert) while the row is
 * being saved instead of closing on an optimistic guess.
 */
export function ExercisePicker({
  visible,
  onClose,
  onSelect,
  pending,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (exerciseId: string) => void;
  pending: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  // Every opening starts from the full catalogue: a query left over from the
  // previous exercise is never what the user is looking for now.
  useEffect(() => {
    if (!visible) setSearch('');
  }, [visible]);

  const exercises = useQuery({
    queryKey: ['exercises', 'picker', search],
    queryFn: () => exerciseService.list({ search: search.trim() || undefined, pageSize: PAGE_SIZE }),
    // Keeps the previous results on screen while the new search resolves, so the
    // list does not collapse into skeletons on every keystroke.
    placeholderData: keepPreviousData,
    enabled: visible,
  });

  const items = exercises.data?.items ?? [];

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.72)' }}>
        {/* The strip above the sheet dismisses it, the way a native sheet does.
            Hidden from the accessibility tree: the close button is the labelled
            way out, and a full-screen target would swallow every swipe. */}
        <Pressable accessible={false} onPress={onClose} style={{ flex: 1 }} />

        <View
          accessibilityViewIsModal
          style={{
            height: SHEET_HEIGHT,
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            backgroundColor: colors.surfaceLow,
            paddingTop: spacing.md,
            paddingHorizontal: spacing.lg,
            // Above the home indicator: the last row must stay tappable.
            paddingBottom: insets.bottom + spacing.md,
            gap: spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Text
              accessibilityRole="header"
              style={{
                flex: 1,
                color: colors.text,
                fontSize: fontSizes.lg,
                fontWeight: '700',
                letterSpacing: -0.5,
              }}
            >
              Añadir ejercicio
            </Text>
            <Pressable
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => ({
                width: minTouchTarget,
                height: minTouchTarget,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radii.full,
                backgroundColor: colors.surfaceHigh,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Ionicons
                accessibilityElementsHidden
                color={colors.text}
                importantForAccessibility="no-hide-descendants"
                name="close"
                size={iconSizes.md}
              />
            </Pressable>
          </View>

          <Input
            autoCapitalize="none"
            autoCorrect={false}
            editable={!pending}
            label="Buscar"
            onChangeText={setSearch}
            placeholder="Nombre, grupo muscular…"
            returnKeyType="search"
            value={search}
          />

          {pending ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <ActivityIndicator color={colors.volt} />
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
                Añadiendo ejercicio…
              </Text>
            </View>
          ) : null}

          {/* While the caller saves, the list stays visible but inert: a second
              tap would add a duplicate exercise to the session. */}
          <View pointerEvents={pending ? 'none' : 'auto'} style={{ flex: 1, opacity: pending ? 0.5 : 1 }}>
            {exercises.isPending ? (
              <View style={{ gap: spacing.sm }}>
                <Skeleton height={72} />
                <Skeleton height={72} />
                <Skeleton height={72} />
                <Skeleton height={72} />
              </View>
            ) : exercises.isError ? (
              <ErrorState error={exercises.error} onRetry={() => void exercises.refetch()} />
            ) : (
              <FlatList
                // 1300+ exercises in the catalogue: virtualised rows only, never
                // a mapped list.
                data={items}
                ItemSeparatorComponent={Divider}
                keyboardShouldPersistTaps="handled"
                keyExtractor={(exercise) => exercise.id}
                ListEmptyComponent={
                  <EmptyState
                    icon="search-outline"
                    message={
                      search
                        ? `Ningún ejercicio coincide con «${search}».`
                        : 'El catálogo está vacío por ahora.'
                    }
                    title="Sin resultados"
                  />
                }
                renderItem={({ item }) => (
                  <NavRow
                    leading={<ExerciseImage exercise={item} size={56} />}
                    onPress={() => onSelect(item.id)}
                    subtitle={[item.grupoMuscular, item.requiredEquipment]
                      .filter(Boolean)
                      .join(' · ')}
                    title={item.nombre}
                  />
                )}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
