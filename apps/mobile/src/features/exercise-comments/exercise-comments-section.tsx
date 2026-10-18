import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import type { RoutineComment } from '@gymsheet/types';
import { RowsSkeleton } from '@/components/feedback';
import { PressableScale } from '@/components/motion';
import { PersonAvatar } from '@/components/person-avatar';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { shortName } from '@/lib/format';
import { routes } from '@/lib/routes';
import { CommentThread } from '@/features/routine-community/comment-thread';
import { MoreSheet } from '@/features/routine-detail/more-sheet';
import { ReportSheet, type ReportTarget } from '@/features/routine-detail/report-sheet';
import { commentCountLabel } from '@/features/exercise-comments/comment-cache';
import { commentMenuActions, ExerciseCommentsEmpty } from '@/features/exercise-comments/comment-menu';
import { useExerciseComments } from '@/features/exercise-comments/use-exercise-comments';
import { colors, iconSizes, minTouchTarget, radii, spacing } from '@/theme';

const PREVIEW = 2;

/**
 * Comentarios dentro de la ficha del ejercicio: el contador, un adelanto de los
 * dos más recientes (con su «me gusta» funcionando) y un campo de mentira que
 * abre la pantalla de comentarios, donde el compositor va fijo sobre el
 * teclado. Escribir al final de una ficha larga dejaba el campo tapado.
 */
export function ExerciseCommentsSection({ exerciseId }: { exerciseId: string }) {
  const router = useRouter();
  const { query, items, total, like, remove, me } = useExerciseComments(exerciseId);
  const [menu, setMenu] = useState<RoutineComment | null>(null);
  const [report, setReport] = useState<ReportTarget | null>(null);

  const open = (options?: { escribir?: boolean; responder?: string }) =>
    router.push(routes.exerciseComments(exerciseId, options));

  const actions = commentMenuActions(menu, {
    onReply: (comment) => open({ responder: comment.id }),
    onDelete: (id) => remove.mutate(id),
    onReport: setReport,
  });

  return (
    <View style={{ gap: spacing.md }} testID="exercise-comments">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
        <Text accessibilityRole="header" variant="headline">
          Comentarios
          {total > 0 ? (
            <Text tabular tone="muted" variant="headline">
              {` · ${total}`}
            </Text>
          ) : null}
        </Text>
        {total > PREVIEW || query.hasNextPage ? (
          <PressableScale
            accessibilityLabel={`Ver los ${commentCountLabel(total)}`}
            haptic="selection"
            hitSlop={12}
            onPress={() => open()}
            testID="exercise-comments-all"
          >
            <Text strong tone="accent" variant="subhead">
              Ver todos
            </Text>
          </PressableScale>
        ) : null}
      </View>

      {query.isPending ? (
        <RowsSkeleton rows={2} thumb={36} />
      ) : query.isError && items.length === 0 ? (
        <View style={{ alignItems: 'flex-start', gap: spacing.sm }}>
          <Text tone="muted" variant="subhead">
            No pudimos cargar los comentarios.
          </Text>
          <Button label="Reintentar" onPress={() => void query.refetch()} size="sm" variant="secondary" />
        </View>
      ) : items.length === 0 ? (
        <ExerciseCommentsEmpty compact />
      ) : (
        <View style={{ gap: spacing.mdl }}>
          {items.slice(0, PREVIEW).map((comment) => (
            <CommentThread
              comment={comment}
              expanded={false}
              handlers={{
                onLike: (item) => like.mutate(item),
                onReply: (item) => open({ responder: item.respuestaA ?? item.id }),
                onMenu: setMenu,
              }}
              key={comment.id}
              maxReplies={0}
              onToggle={() => open({ responder: comment.id })}
            />
          ))}
        </View>
      )}

      {/* Campo de mentira: abre la pantalla con el compositor fijo y el teclado arriba. */}
      <PressableScale
        accessibilityLabel="Escribe un comentario"
        accessibilityRole="button"
        haptic="selection"
        onPress={() => open({ escribir: true })}
        scaleTo={0.98}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
        testID="exercise-comment-entry"
      >
        <PersonAvatar id={me?.id ?? 'me'} name={shortName(me?.nombreCompleto, me?.email)} size={36} />
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: minTouchTarget,
            borderRadius: radii.full,
            borderCurve: 'continuous',
            backgroundColor: colors.surfaceHigh,
            paddingHorizontal: spacing.md,
          }}
        >
          <Text tone="muted" variant="subhead">
            Escribe un consejo o una duda…
          </Text>
          <Ionicons color={colors.textMuted} name="chatbubble-ellipses-outline" size={iconSizes.md} />
        </View>
      </PressableScale>

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
