import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ApiError } from '@gymsheet/api-client';
import { ratingLabel } from '@gymsheet/hooks';
import type { Routine, RoutineComment } from '@gymsheet/types';
import { communityService } from '@/api/services';
import { PressableScale } from '@/components/motion';
import { PersonAvatar } from '@/components/person-avatar';
import { RatingStars } from '@/features/routine-detail/detail-header';
import { Text as AppText } from '@/components/text';
import { Button, Input } from '@/components/ui';
import { notify } from '@/notifications';
import type { ReportTarget } from '@/features/routine-detail/report-sheet';
import { cardPadding, colors, fontSizes, iconSizes, minTouchTarget, radii, ratingStar, shadows, spacing } from '@/theme';

const AVATAR = 32;

function Stars({
  value,
  disabled,
  onRate,
}: {
  value: number | null;
  disabled: boolean;
  onRate: (stars: number) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <PressableScale
          accessibilityLabel={`Valorar con ${star} ${star === 1 ? 'estrella' : 'estrellas'}`}
          accessibilityState={{ selected: (value ?? 0) >= star }}
          disabled={disabled}
          haptic="selection"
          key={star}
          onPress={() => onRate(star)}
          style={{ width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1 }}
          testID={`star-${star}`}
        >
          <Ionicons
            // Ámbar, como las estrellas de la tarjeta y de la franja de cifras.
            color={(value ?? 0) >= star ? ratingStar : colors.textMuted}
            name={(value ?? 0) >= star ? 'star' : 'star-outline'}
            size={iconSizes.lg}
          />
        </PressableScale>
      ))}
    </View>
  );
}

function CommentRow({
  comment,
  nested,
  onReply,
  onReport,
  onDelete,
}: {
  comment: RoutineComment;
  nested: boolean;
  onReply: (comment: RoutineComment) => void;
  onReport: (target: ReportTarget) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <View style={{ gap: spacing.smd, marginLeft: nested ? spacing.xl : 0 }} testID={`comment-${comment.id}`}>
      <View
        style={{
          flexDirection: 'row',
          gap: spacing.smd,
          borderRadius: radii.xl,
          borderCurve: 'continuous',
          backgroundColor: colors.surfaceLow,
          boxShadow: shadows.e1,
          paddingTop: spacing.md,
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.xs,
        }}
      >
        <PersonAvatar id={comment.autor.id} name={comment.autor.nombre} size={AVATAR} />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <AppText numberOfLines={1} strong variant="subhead">
            {comment.autor.nombre}
          </AppText>
          <AppText variant="subhead">{comment.texto}</AppText>
          <View style={{ flexDirection: 'row', gap: spacing.lg }}>
            {!nested ? (
              <PressableScale
                accessibilityLabel={`Responder a ${comment.autor.nombre}`}
                hitSlop={8}
                onPress={() => onReply(comment)}
                style={{ minHeight: minTouchTarget, justifyContent: 'center' }}
              >
                <AppText strong tone="muted" variant="footnote">
                  Responder
                </AppText>
              </PressableScale>
            ) : null}
            {comment.esMio ? (
              <PressableScale
                accessibilityLabel="Borrar mi comentario"
                hitSlop={8}
                onPress={() => onDelete(comment.id)}
                style={{ minHeight: minTouchTarget, justifyContent: 'center' }}
              >
                <AppText strong tone="muted" variant="footnote">
                  Borrar
                </AppText>
              </PressableScale>
            ) : (
              <PressableScale
                accessibilityLabel={`Denunciar comentario de ${comment.autor.nombre}`}
                hitSlop={8}
                onPress={() => onReport({ kind: 'COMMENT', id: comment.id, label: 'Comentario' })}
                style={{ minHeight: minTouchTarget, justifyContent: 'center' }}
                testID={`report-comment-${comment.id}`}
              >
                <AppText strong tone="muted" variant="footnote">
                  Denunciar
                </AppText>
              </PressableScale>
            )}
          </View>
        </View>
      </View>
      {comment.respuestas.map((reply) => (
        <CommentRow comment={reply} key={reply.id} nested onDelete={onDelete} onReply={onReply} onReport={onReport} />
      ))}
    </View>
  );
}

/** Valoración con estrellas y comentarios de una rutina pública (RF-12). */
export function CommunitySection({
  routine,
  onReport,
}: {
  routine: Routine;
  onReport: (target: ReportTarget) => void;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<RoutineComment | null>(null);
  const ratingKey = ['community', 'rating', routine.id] as const;
  const commentsKey = ['community', 'comments', routine.id] as const;

  const rating = useQuery({
    queryKey: ratingKey,
    queryFn: () => communityService.ratingSummary('ROUTINE', routine.id),
  });
  const comments = useInfiniteQuery({
    queryKey: commentsKey,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => communityService.comments('ROUTINE', routine.id, pageParam),
    getNextPageParam: (last) => last.siguienteCursor,
  });

  const rate = useMutation({
    mutationFn: (stars: number) => communityService.rate('ROUTINE', routine.id, stars),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ratingKey });
      await queryClient.invalidateQueries({ queryKey: ['routine', routine.id] });
    },
    onError: (error: Error) =>
      error instanceof ApiError && error.code === 'CANNOT_RATE_OWN'
        ? notify.info('No puedes valorar tu rutina.')
        : notify.error(error),
  });
  const send = useMutation({
    mutationFn: () => communityService.comment('ROUTINE', routine.id, draft.trim(), replyTo?.id ?? null),
    onSuccess: async () => {
      setDraft('');
      setReplyTo(null);
      await queryClient.invalidateQueries({ queryKey: commentsKey });
    },
    onError: (error: Error) => notify.error(error),
  });
  const remove = useMutation({
    mutationFn: (id: string) => communityService.deleteComment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: commentsKey }),
    onError: (error: Error) => notify.error(error),
  });

  const items = comments.data?.pages.flatMap((page) => page.items) ?? [];
  const summary = rating.data ?? { ...routine.valoracion, miValoracion: null };

  return (
    <View style={{ gap: spacing.lg }} testID="community">
      {/* La nota de la comunidad y la tuya en una sola tarjeta: arriba la
          media grande con sus estrellas, debajo «Tu valoración» para tocar. */}
      <View
        style={{
          gap: spacing.md,
          padding: cardPadding,
          borderRadius: radii.xl,
          borderCurve: 'continuous',
          backgroundColor: colors.surfaceLow,
          boxShadow: shadows.e1,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <AppText style={{ fontSize: fontSizes.xl, lineHeight: fontSizes.xl * 1.15 }} variant="numeric">
            {summary.promedio ? summary.promedio.toFixed(1).replace('.', ',') : '—'}
          </AppText>
          <View
            accessibilityLabel={ratingLabel(summary).replace('★', 'Valoración')}
            accessibilityLiveRegion="polite"
            accessible
            style={{ flex: 1, gap: spacing.xs }}
            testID="rating-summary"
          >
            {summary.promedio ? <RatingStars size={iconSizes.sm} value={summary.promedio} /> : null}
            <AppText tone="muted" variant="footnote">
              {summary.total === 0 ? 'Sin valoraciones' : summary.total === 1 ? '1 reseña' : `${summary.total} reseñas`}
            </AppText>
          </View>
        </View>
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
        <View style={{ gap: spacing.xs }}>
          <AppText tone="secondary" variant="footnote">
            {routine.esMia
              ? 'No puedes valorar tu rutina'
              : summary.miValoracion
                ? `Tu valoración: ${summary.miValoracion} de 5`
                : 'Toca para valorarla'}
          </AppText>
          <View style={{ marginLeft: -spacing.smd }}>
            <Stars disabled={routine.esMia} onRate={(stars) => rate.mutate(stars)} value={summary.miValoracion} />
          </View>
        </View>
      </View>

      <AppText accessibilityRole="header" variant="headline">
        Comentarios{items.length > 0 ? ` (${items.length})` : ''}
      </AppText>
      {items.length === 0 && !comments.isPending ? (
        <AppText tone="muted" variant="subhead">
          Todavía no hay comentarios. Sé la primera persona en comentar.
        </AppText>
      ) : null}
      {items.map((comment) => (
        <CommentRow
          comment={comment}
          key={comment.id}
          nested={false}
          onDelete={(id) => remove.mutate(id)}
          onReply={setReplyTo}
          onReport={onReport}
        />
      ))}
      {comments.hasNextPage ? (
        <Button label="Ver más comentarios" onPress={() => void comments.fetchNextPage()} variant="ghost" />
      ) : null}

      {replyTo ? (
        <AppText tone="muted" variant="footnote">
          Respondiendo a {replyTo.autor.nombre}
        </AppText>
      ) : null}
      <Input
        label="Escribe un comentario"
        maxLength={1000}
        multiline
        onChangeText={setDraft}
        placeholder="Escribe un comentario"
        testID="comment-input"
        value={draft}
      />
      <Button
        disabled={draft.trim().length === 0}
        label={replyTo ? 'Responder' : 'Comentar'}
        loading={send.isPending}
        onPress={() => send.mutate()}
      />
    </View>
  );
}
