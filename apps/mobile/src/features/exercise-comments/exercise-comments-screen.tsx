import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { BottomTabBarHeightContext } from 'expo-router/build/react-navigation/bottom-tabs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useContext, useEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, StyleSheet, View, type TextInput } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { exerciseDisplayName } from '@gymsheet/hooks';
import type { CommentOrder, RoutineComment } from '@gymsheet/types';
import { exerciseService } from '@/api/services';
import { ErrorState, RowsSkeleton } from '@/components/feedback';
import { BadgePop, PressableScale, SegmentLabel, SegmentedPill } from '@/components/motion';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { CommentComposer } from '@/features/routine-community/comment-composer';
import { CommentThread } from '@/features/routine-community/comment-thread';
import { MediaPickerSheet } from '@/features/routine-community/media-picker-sheet';
import type { PendingAttachment } from '@/features/routine-community/attachments';
import { pickFile, pickFromCamera, pickFromLibrary } from '@/features/routine-community/pick-media';
import { MoreSheet, type MoreAction } from '@/features/routine-detail/more-sheet';
import { ReportSheet, type ReportTarget } from '@/features/routine-detail/report-sheet';
import { commentMenuActions, ExerciseCommentsEmpty } from '@/features/exercise-comments/comment-menu';
import { useExerciseComments } from '@/features/exercise-comments/use-exercise-comments';
import { alpha, colors, fontSizes, gutter, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

/** Lo que ocupa el compositor en reposo: el final de la lista lo reserva. */
const COMPOSER_SPACE = minTouchTarget + spacing.md * 2;

const ORDERS: readonly { value: CommentOrder; label: string }[] = [
  { value: 'recientes', label: 'Recientes' },
  { value: 'utiles', label: 'Más útiles' },
];

/**
 * Comentarios de un ejercicio a pantalla completa (`/ejercicios/:id/comentarios`):
 * consejos, técnica y dudas. Arriba, «Recientes | Más útiles» (los de más «me
 * gusta»); la lista ocupa la pantalla y el compositor va fijo abajo, subiendo
 * con el teclado en el hilo de UI por encima de la zona segura.
 */
export function ExerciseCommentsScreen() {
  const { id, escribir, responder } = useLocalSearchParams<{ id: string; escribir?: string; responder?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBar = useContext(BottomTabBarHeightContext) ?? 0;
  const bottom = Math.max(insets.bottom, tabBar);
  const keyboard = useAnimatedKeyboard();
  const input = useRef<TextInput | null>(null);
  const list = useRef<FlatList<RoutineComment> | null>(null);

  const [order, setOrder] = useState<CommentOrder>('recientes');
  const exercise = useQuery({
    queryKey: ['exercise', id],
    queryFn: () => exerciseService.get(id),
    enabled: Boolean(id),
    staleTime: 10 * 60 * 1000,
  });
  const { query, items, total, send, like, remove } = useExerciseComments(id, order);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<RoutineComment | null>(null);
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const [menu, setMenu] = useState<RoutineComment | null>(null);
  const [report, setReport] = useState<ReportTarget | null>(null);
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Se llegó desde la ficha: «Escribe…» abre el teclado; «Responder» abre además el hilo.
  const preset = useRef(false);
  useEffect(() => {
    if (preset.current) return;
    if (responder) {
      if (items.length === 0) return;
      const target = items.find((item) => item.id === responder);
      preset.current = true;
      if (!target) return;
      setReplyTo(target);
      setOpen((current) => new Set(current).add(target.id));
    } else if (escribir) {
      preset.current = true;
    } else {
      return;
    }
    const timer = setTimeout(() => input.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, [escribir, items, responder]);

  const lift = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.max(0, keyboard.height.value - bottom) }],
  }));

  const startReply = (comment: RoutineComment) => {
    // Un solo nivel: responder a una respuesta contesta en el mismo hilo.
    const parent = comment.respuestaA ? (items.find((item) => item.id === comment.respuestaA) ?? comment) : comment;
    setReplyTo(parent);
    setOpen((current) => new Set(current).add(parent.id));
    input.current?.focus();
  };
  // El campo suelta el foco ANTES de abrir una hoja: si no, iOS se lo devuelve al cerrarla.
  const blur = () => {
    input.current?.blur();
    Keyboard.dismiss();
  };
  const submit = () => {
    const texto = draft.trim();
    if (!texto && !attachment) return;
    send.mutate({ texto, respuestaA: replyTo?.id ?? null, adjunto: attachment });
    setDraft('');
    setAttachment(null);
    if (!replyTo) list.current?.scrollToOffset({ offset: 0, animated: true });
    setReplyTo(null);
  };

  // El selector del sistema se abre cuando la hoja ya se fue: iOS no presenta dos a la vez.
  const choose = (pick: () => Promise<PendingAttachment | null>) => () => {
    setAddOpen(false);
    setTimeout(() => void pick().then((picked) => picked && setAttachment(picked)), 450);
  };
  const addActions: MoreAction[] = [
    { key: 'library', label: 'Foto o video', icon: 'images-outline', onPress: choose(pickFromLibrary) },
    { key: 'camera', label: 'Cámara', icon: 'camera-outline', onPress: choose(pickFromCamera) },
    { key: 'file', label: 'Archivo', icon: 'document-outline', onPress: choose(pickFile) },
    {
      key: 'gif',
      label: 'GIF o sticker',
      icon: 'sparkles-outline',
      onPress: () => {
        setAddOpen(false);
        setTimeout(() => setPickerOpen(true), 450);
      },
    },
  ];
  const actions = commentMenuActions(menu, {
    onReply: startReply,
    onDelete: (commentId) => remove.mutate(commentId),
    onReport: setReport,
  });
  const name = exercise.data ? exerciseDisplayName(exercise.data) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          gap: spacing.sm,
          paddingTop: insets.top + spacing.sm,
          paddingBottom: spacing.smd,
          paddingHorizontal: gutter,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginLeft: -spacing.sm }}>
          <PressableScale
            accessibilityLabel="Volver"
            haptic="none"
            onPress={() => router.back()}
            scaleTo={0.9}
            style={{ width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center' }}
            testID="exercise-comments-back"
          >
            <Ionicons color={colors.text} name="chevron-back" size={iconSizes.lg} />
          </PressableScale>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text accessibilityRole="header" variant="headline">
                Comentarios
              </Text>
              {total > 0 ? (
                <BadgePop value={total}>
                  <Text tabular tone="muted" variant="subhead">
                    {total}
                  </Text>
                </BadgePop>
              ) : null}
            </View>
            {name ? (
              <Text numberOfLines={1} tone="muted" variant="footnote">
                {name}
              </Text>
            ) : null}
          </View>
        </View>
        <View accessibilityRole="tablist">
          <SegmentedPill
            fill
            itemStyle={{ minHeight: minTouchTarget - spacing.xs, alignItems: 'center', justifyContent: 'center' }}
            onChange={setOrder}
            options={ORDERS.map((item) => ({ value: item.value, accessibilityLabel: `Ordenar por ${item.label.toLowerCase()}` }))}
            renderItem={(option, active) => (
              <SegmentLabel
                active={active}
                activeColor={colors.text}
                inactiveColor={colors.textMuted}
                label={ORDERS.find((item) => item.value === option.value)?.label ?? ''}
                style={{ fontSize: fontSizes.sm, fontWeight: semibold }}
              />
            )}
            style={{ borderRadius: radii.full, backgroundColor: colors.surfaceLow, padding: spacing.xs }}
            value={order}
          />
        </View>
      </View>

      {query.isPending ? (
        <View style={{ padding: gutter }}>
          <RowsSkeleton rows={4} thumb={36} />
        </View>
      ) : query.isError && items.length === 0 ? (
        <View style={{ padding: gutter }}>
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </View>
      ) : (
        <FlatList
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{
            paddingHorizontal: gutter,
            paddingTop: spacing.lg,
            paddingBottom: bottom + COMPOSER_SPACE + spacing.xl,
            gap: spacing.mdl,
            flexGrow: 1,
          }}
          data={items}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<ExerciseCommentsEmpty />}
          ListFooterComponent={
            query.hasNextPage ? (
              <Button
                label="Ver más comentarios"
                loading={query.isFetchingNextPage}
                onPress={() => void query.fetchNextPage()}
                variant="ghost"
              />
            ) : null
          }
          onRefresh={() => void query.refetch()}
          ref={list}
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          renderItem={({ item }) => (
            <CommentThread
              comment={item}
              expanded={open.has(item.id)}
              handlers={{
                onLike: (comment) => like.mutate(comment),
                onReply: startReply,
                onMenu: (comment) => {
                  blur();
                  setMenu(comment);
                },
              }}
              onToggle={() =>
                setOpen((current) => {
                  const next = new Set(current);
                  if (next.has(item.id)) next.delete(item.id);
                  else next.add(item.id);
                  return next;
                })
              }
            />
          )}
          showsVerticalScrollIndicator={false}
          testID="exercise-comments-list"
        />
      )}

      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom,
            paddingHorizontal: gutter,
            paddingVertical: spacing.smd,
            backgroundColor: alpha(colors.background, 0.96),
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
          },
          lift,
        ]}
      >
        <CommentComposer
          attachment={attachment}
          onAdd={() => {
            blur();
            setAddOpen(true);
          }}
          onCancelReply={() => setReplyTo(null)}
          onChange={setDraft}
          onClearAttachment={() => setAttachment(null)}
          onEmoji={() => {
            blur();
            setPickerOpen(true);
          }}
          onSend={submit}
          ref={input}
          replyTo={replyTo}
          sending={send.isPending}
          value={draft}
        />
      </Animated.View>

      <MoreSheet actions={addActions} onClose={() => setAddOpen(false)} title="Adjuntar" visible={addOpen} />
      <MediaPickerSheet
        onAttachment={(picked) => setAttachment({ source: 'remote', attachment: picked })}
        onClose={() => setPickerOpen(false)}
        onEmoji={(emoji) => setDraft((current) => (current + emoji).slice(0, 1000))}
        visible={pickerOpen}
      />
      <MoreSheet
        actions={actions}
        onClose={() => setMenu(null)}
        title={menu ? `Comentario de ${menu.autor.nombre}` : ''}
        visible={menu !== null}
      />
      <ReportSheet onClose={() => setReport(null)} target={report} />
    </View>
  );
}
