import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { ApiError } from '@gymsheet/api-client';
import { ratingLabel } from '@gymsheet/hooks';
import type { CommentView } from '@gymsheet/schemas';
import type { Routine } from '@gymsheet/types';
import { communityService } from '@/api/services';
import { PressableScale } from '@/components/motion';
import { Button, Input } from '@/components/ui';
import { notify } from '@/notifications';
import type { ReportTarget } from '@/features/routine-detail/report-sheet';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

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
            color={(value ?? 0) >= star ? colors.volt : colors.textMuted}
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
  comment: CommentView;
  nested: boolean;
  onReply: (comment: CommentView) => void;
  onReport: (target: ReportTarget) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <View style={{ gap: spacing.xs, marginLeft: nested ? spacing.lg : 0 }} testID={`comment-${comment.id}`}>
      <View
        style={{ gap: 4, borderRadius: radii.md, backgroundColor: colors.surfaceLow, padding: spacing.md }}
      >
        <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: semibold }}>
          {comment.autor.nombre}
        </Text>
        <Text style={{ color: colors.text, fontSize: fontSizes.sm, lineHeight: 20 }}>{comment.texto}</Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          {!nested ? (
            <PressableScale
              accessibilityLabel={`Responder a ${comment.autor.nombre}`}
              hitSlop={8}
              onPress={() => onReply(comment)}
              style={{ minHeight: minTouchTarget, justifyContent: 'center' }}
            >
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Responder</Text>
            </PressableScale>
          ) : null}
          {comment.esMio ? (
            <PressableScale
              accessibilityLabel="Borrar mi comentario"
              hitSlop={8}
              onPress={() => onDelete(comment.id)}
              style={{ minHeight: minTouchTarget, justifyContent: 'center' }}
            >
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Borrar</Text>
            </PressableScale>
          ) : (
            <PressableScale
              accessibilityLabel={`Denunciar comentario de ${comment.autor.nombre}`}
              hitSlop={8}
              onPress={() => onReport({ kind: 'COMMENT', id: comment.id, label: 'Comentario' })}
              style={{ minHeight: minTouchTarget, justifyContent: 'center' }}
              testID={`report-comment-${comment.id}`}
            >
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Denunciar</Text>
            </PressableScale>
          )}
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
  const [replyTo, setReplyTo] = useState<CommentView | null>(null);
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
    <View style={{ gap: spacing.md }} testID="community">
      <View style={{ gap: spacing.xs }}>
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}
          testID="rating-summary"
        >
          {ratingLabel(summary)}
        </Text>
        <Stars disabled={routine.esMia} onRate={(stars) => rate.mutate(stars)} value={summary.miValoracion} />
        {routine.esMia ? (
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>No puedes valorar tu rutina</Text>
        ) : summary.miValoracion ? (
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
            Tu valoración: {summary.miValoracion} de 5
          </Text>
        ) : null}
      </View>

      <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
        Comentarios{items.length > 0 ? ` (${items.length})` : ''}
      </Text>
      {items.length === 0 && !comments.isPending ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
          Todavía no hay comentarios. Sé la primera persona en comentar.
        </Text>
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
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
          Respondiendo a {replyTo.autor.nombre}
        </Text>
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
