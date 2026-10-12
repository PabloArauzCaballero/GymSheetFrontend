import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import type { Routine, RoutineComment } from '@gymsheet/types';
import { RowsSkeleton } from '@/components/feedback';
import { PressableScale } from '@/components/motion';
import { PersonAvatar } from '@/components/person-avatar';
import { Text } from '@/components/text';
import { shortName } from '@/lib/format';
import { CommentThread } from '@/features/routine-community/comment-thread';
import { CommentsEmpty } from '@/features/routine-community/comments-screen';
import { RatingCard } from '@/features/routine-community/rating-card';
import { countComments, useRoutineComments } from '@/features/routine-community/use-comments';
import type { ReportTarget } from '@/features/routine-detail/report-sheet';
import { MoreSheet, type MoreAction } from '@/features/routine-detail/more-sheet';
import { colors, iconSizes, minTouchTarget, spacing } from '@/theme';
import { useState } from 'react';

const PREVIEW = 2;

/**
 * La comunidad de una rutina pública (RF-12) dentro del detalle: la tarjeta de
 * valoración y un adelanto de los comentarios —los dos primeros, con su «me
 * gusta» funcionando— que lleva a la pantalla de comentarios, donde está el
 * compositor fijo. Tocar el campo de aquí abre esa pantalla con el teclado.
 */
export function CommunitySection({
  routine,
  onReport,
}: {
  routine: Routine;
  onReport: (target: ReportTarget) => void;
}) {
  const router = useRouter();
  const { query, items, like, remove, me } = useRoutineComments(routine.id);
  const [menu, setMenu] = useState<RoutineComment | null>(null);
  const myName = shortName(me?.nombreCompleto, me?.email);
  const total = countComments(items);
  const openComments = (responder?: string) =>
    router.push({
      pathname: '/routines/[id]/comentarios',
      params: { id: routine.id, ...(responder ? { responder } : null) },
    });

  const actions: MoreAction[] = menu
    ? [
        { key: 'reply', label: 'Responder', icon: 'return-down-forward', onPress: () => openComments(menu.id) },
        menu.esMio
          ? { key: 'delete', label: 'Eliminar', icon: 'trash-outline', destructive: true, onPress: () => remove.mutate(menu.id) }
          : {
              key: 'report',
              label: 'Denunciar comentario',
              icon: 'flag-outline',
              destructive: true,
              onPress: () => onReport({ kind: 'COMMENT', id: menu.id, label: 'Comentario' }),
            },
      ]
    : [];

  return (
    <View style={{ gap: spacing.lg }} testID="community">
      <RatingCard routine={routine} />

      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text accessibilityRole="header" variant="headline">
            Comentarios{total > 0 ? ` · ${total}${query.hasNextPage ? '+' : ''}` : ''}
          </Text>
          {total > PREVIEW || query.hasNextPage ? (
            <PressableScale
              accessibilityLabel="Ver todos los comentarios"
              haptic="selection"
              hitSlop={12}
              onPress={() => openComments()}
              testID="open-comments"
            >
              <Text strong tone="accent" variant="subhead">
                Ver todos
              </Text>
            </PressableScale>
          ) : null}
        </View>

        {query.isPending ? (
          <RowsSkeleton rows={2} />
        ) : items.length === 0 ? (
          <CommentsEmpty />
        ) : (
          <View style={{ gap: spacing.mdl }}>
            {items.slice(0, PREVIEW).map((comment) => (
              <CommentThread
                comment={comment}
                expanded={false}
                handlers={{
                  onLike: (item) => like.mutate(item),
                  onReply: (item) => openComments(item.id),
                  onMenu: setMenu,
                }}
                key={comment.id}
                maxReplies={0}
                onToggle={() => openComments(comment.id)}
              />
            ))}
          </View>
        )}

        {/* Campo de mentira: abre la pantalla de comentarios, donde el
            compositor va fijo sobre el teclado. */}
        <PressableScale
          accessibilityLabel="Escribe un comentario"
          haptic="selection"
          onPress={() => openComments()}
          scaleTo={0.98}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
          testID="comment-entry"
        >
          <PersonAvatar id={me?.id ?? 'me'} name={myName} size={36} />
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: minTouchTarget,
              borderRadius: 22,
              borderCurve: 'continuous',
              backgroundColor: colors.surfaceHigh,
              paddingHorizontal: spacing.md,
            }}
          >
            <Text tone="muted" variant="subhead">
              Escribe un comentario…
            </Text>
            <Ionicons color={colors.textMuted} name="chatbubble-ellipses-outline" size={iconSizes.md} />
          </View>
        </PressableScale>
      </View>

      <MoreSheet
        actions={actions}
        onClose={() => setMenu(null)}
        title={menu ? `Comentario de ${menu.autor.nombre}` : ''}
        visible={menu !== null}
      />
    </View>
  );
}
