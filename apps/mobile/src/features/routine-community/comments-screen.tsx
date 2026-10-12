import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { BottomTabBarHeightContext } from 'expo-router/build/react-navigation/bottom-tabs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useContext, useEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, StyleSheet, View, type TextInput } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RoutineComment } from '@gymsheet/types';
import { routineService } from '@/api/services';
import { AmbientBackground } from '@/components/ambient';
import { ErrorState, RowsSkeleton } from '@/components/feedback';
import { BadgePop, EnterUp, PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { shortName } from '@/lib/format';
import { Button } from '@/components/ui';
import { CommentComposer } from '@/features/routine-community/comment-composer';
import { CommentThread } from '@/features/routine-community/comment-thread';
import { countComments, useRoutineComments } from '@/features/routine-community/use-comments';
import { MoreSheet, type MoreAction } from '@/features/routine-detail/more-sheet';
import { ReportSheet, type ReportTarget } from '@/features/routine-detail/report-sheet';
import { alpha, colors, gutter, iconSizes, minTouchTarget, radii, spacing } from '@/theme';

/** Lo que ocupa el compositor en reposo: el final de la lista lo reserva. */
const COMPOSER_SPACE = minTouchTarget + spacing.md * 2;

/**
 * Estado vacío con voz propia: nadie ha comentado todavía. El icono entra una
 * vez (no se queda moviéndose) y el texto invita a contar cómo fue.
 */
export function CommentsEmpty() {
  return (
    <EnterUp style={{ alignItems: 'center', gap: spacing.smd, paddingVertical: spacing.xl }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: radii.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceHigh,
        }}
      >
        <Ionicons color={colors.textSecondary} name="chatbubbles-outline" size={iconSizes.xl} />
      </View>
      <Text style={{ textAlign: 'center' }} variant="headline">
        Aquí todavía no ha hablado nadie
      </Text>
      <Text style={{ textAlign: 'center', maxWidth: 280 }} tone="muted" variant="subhead">
        ¿La entrenaste? Cuenta cómo te fue: a quien venga detrás le sirve más que cualquier descripción.
      </Text>
    </EnterUp>
  );
}

/**
 * Comentarios de una rutina a pantalla completa (`/routines/:id/comentarios`).
 * La lista ocupa la pantalla y el compositor va fijo abajo: sube con el
 * teclado (en el hilo de UI) y nunca queda tapado. Dentro del detalle, con el
 * campo al final de un scroll largo, había que bajar hasta el fondo para
 * escribir y el teclado tapaba lo que se estaba contestando.
 */
export function CommentsScreen() {
  const { id, responder } = useLocalSearchParams<{ id: string; responder?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBar = useContext(BottomTabBarHeightContext) ?? 0;
  const bottom = Math.max(insets.bottom, tabBar);
  const keyboard = useAnimatedKeyboard();
  const input = useRef<TextInput | null>(null);
  const list = useRef<FlatList<RoutineComment> | null>(null);

  const routine = useQuery({ queryKey: ['routine', id], queryFn: () => routineService.get(id), enabled: Boolean(id) });
  const { query, items, send, like, remove, me } = useRoutineComments(id);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<RoutineComment | null>(null);
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const [menu, setMenu] = useState<RoutineComment | null>(null);
  const [report, setReport] = useState<ReportTarget | null>(null);

  // Se llegó tocando «Responder» en el detalle: el hilo abierto y el campo listo.
  const preset = useRef(false);
  useEffect(() => {
    if (preset.current || !responder || items.length === 0) return;
    const target = items.find((item) => item.id === responder);
    if (!target) return;
    preset.current = true;
    setReplyTo(target);
    setOpen((current) => new Set(current).add(target.id));
    setTimeout(() => input.current?.focus(), 350);
  }, [items, responder]);

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
  // El campo suelta el foco ANTES de abrir el menú: si lo conserva, iOS se lo
  // devuelve al cerrarse la hoja y el teclado vuelve a subir sin que nadie lo pida.
  const openMenu = (comment: RoutineComment) => {
    input.current?.blur();
    Keyboard.dismiss();
    setMenu(comment);
  };
  const submit = () => {
    const texto = draft.trim();
    if (!texto) return;
    send.mutate({ texto, respuestaA: replyTo?.id ?? null });
    setDraft('');
    if (!replyTo) list.current?.scrollToOffset({ offset: 0, animated: true });
    setReplyTo(null);
  };

  const actions: MoreAction[] = menu
    ? [
        { key: 'reply', label: 'Responder', icon: 'return-down-forward', onPress: () => startReply(menu) },
        menu.esMio
          ? { key: 'delete', label: 'Eliminar', icon: 'trash-outline', destructive: true, onPress: () => remove.mutate(menu.id) }
          : {
              key: 'report',
              label: 'Denunciar comentario',
              icon: 'flag-outline',
              destructive: true,
              onPress: () => setReport({ kind: 'COMMENT', id: menu.id, label: 'Comentario' }),
            },
      ]
    : [];
  const myName = shortName(me?.nombreCompleto, me?.email);
  const total = countComments(items);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AmbientBackground waveform={false} />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingTop: insets.top + spacing.sm,
          paddingBottom: spacing.sm,
          paddingHorizontal: gutter - spacing.sm,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        }}
      >
        <PressableScale
          accessibilityLabel="Volver"
          haptic="none"
          onPress={() => router.back()}
          scaleTo={0.9}
          style={{ width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center' }}
          testID="comments-back"
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
          {routine.data ? (
            <Text numberOfLines={1} tone="muted" variant="footnote">
              {routine.data.nombre}
            </Text>
          ) : null}
        </View>
      </View>

      {query.isPending ? (
        <View style={{ padding: gutter }}>
          <RowsSkeleton rows={4} />
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
          ListEmptyComponent={<CommentsEmpty />}
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
              handlers={{ onLike: (comment) => like.mutate(comment), onReply: startReply, onMenu: openMenu }}
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
          testID="comments-list"
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
            paddingTop: spacing.smd,
            paddingBottom: spacing.smd,
            backgroundColor: alpha(colors.background, 0.96),
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
          },
          lift,
        ]}
      >
        <CommentComposer
          me={{ id: me?.id ?? 'me', name: myName }}
          onCancelReply={() => setReplyTo(null)}
          onChange={setDraft}
          onSend={submit}
          ref={input}
          replyTo={replyTo}
          sending={false}
          value={draft}
        />
      </Animated.View>

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
