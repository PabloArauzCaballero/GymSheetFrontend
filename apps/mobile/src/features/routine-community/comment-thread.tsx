import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { RoutineComment } from '@gymsheet/types';
import { BadgePop, Burst, Pop, PressableScale, useListMotion } from '@/components/motion';
import { PersonAvatar } from '@/components/person-avatar';
import { Text } from '@/components/text';
import { relativeTimeEs } from '@/features/routine-community/relative-time';
import { colors, iconSizes, likeHeart, minTouchTarget, radii, shadows, spacing, threadLine } from '@/theme';

const AVATAR = 36;
const REPLY_AVATAR = 28;
const BUBBLE_RADIUS = 18;

export type CommentHandlers = {
  onLike: (comment: RoutineComment) => void;
  onReply: (comment: RoutineComment) => void;
  onMenu: (comment: RoutineComment) => void;
};

/** Acción de la línea pequeña bajo la burbuja («Me gusta», «Responder»). */
function LineAction({
  label,
  active = false,
  onPress,
  accessibilityLabel,
  testID,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
}) {
  return (
    <PressableScale
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active }}
      haptic="none"
      hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
      onPress={onPress}
      scaleTo={0.92}
      testID={testID}
    >
      <Text strong style={active ? { color: likeHeart } : undefined} tone="muted" variant="footnote">
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * Un comentario, como en Facebook: la cara a la izquierda, una burbuja gris
 * redondeada con el nombre en negrita y el texto, y debajo una línea pequeña
 * con el tiempo, «Me gusta» y «Responder». Si tiene «me gusta», un globito con
 * el corazón y la cuenta se monta en la esquina inferior derecha de la burbuja.
 * Mantener pulsada la burbuja abre el menú (eliminar si es mío, denunciar).
 */
function CommentBubble({
  comment,
  reply,
  handlers,
}: {
  comment: RoutineComment;
  reply: boolean;
  handlers: CommentHandlers;
}) {
  const [burst, setBurst] = useState(false);
  const deleted = comment.texto === '';
  const pending = comment.id.startsWith('temp-');
  const size = reply ? REPLY_AVATAR : AVATAR;
  const like = () => {
    if (!comment.meGusta) {
      setBurst(true);
      setTimeout(() => setBurst(false), 460);
    }
    handlers.onLike(comment);
  };

  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, opacity: pending ? 0.6 : 1 }} testID={`comment-${comment.id}`}>
      <PersonAvatar id={comment.autor.id} name={comment.autor.nombre} photoUrl={comment.autor.fotoUrl} size={size} />
      <View style={{ flex: 1, alignItems: 'flex-start', gap: spacing.xs }}>
        <View style={{ maxWidth: '100%' }}>
          <PressableScale
            accessibilityHint="Mantén pulsado para ver las opciones"
            accessibilityLabel={`${comment.autor.nombre}: ${deleted ? 'comentario eliminado' : comment.texto}`}
            accessibilityRole="text"
            disabled={deleted || pending}
            haptic="none"
            onLongPress={() => handlers.onMenu(comment)}
            onPress={() => undefined}
            scaleTo={0.98}
            style={{
              paddingHorizontal: spacing.smd + spacing.xxs,
              paddingVertical: spacing.sm + spacing.xxs,
              borderRadius: BUBBLE_RADIUS,
              borderCurve: 'continuous',
              backgroundColor: colors.surfaceHigh,
            }}
          >
            <Text numberOfLines={1} strong variant="footnote">
              {comment.autor.nombre}
            </Text>
            <Text style={deleted ? { fontStyle: 'italic' } : undefined} tone={deleted ? 'muted' : 'default'} variant="subhead">
              {deleted ? 'Comentario eliminado' : comment.texto}
            </Text>
          </PressableScale>
          {comment.likes > 0 ? (
            <View
              accessibilityLabel={`${comment.likes} me gusta`}
              accessible
              style={{
                position: 'absolute',
                right: -spacing.sm,
                bottom: -spacing.sm,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xxs + 1,
                paddingHorizontal: spacing.xs + 2,
                height: 22,
                borderRadius: radii.full,
                backgroundColor: colors.surfaceHighest,
                boxShadow: shadows.e1,
              }}
              testID={`comment-likes-${comment.id}`}
            >
              <Ionicons color={likeHeart} name="heart" size={iconSizes.xs} />
              <BadgePop value={comment.likes}>
                <Text tabular tone="secondary" variant="caption">
                  {comment.likes}
                </Text>
              </BadgePop>
            </View>
          ) : null}
        </View>

        {deleted ? null : (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              paddingLeft: spacing.smd,
              minHeight: 24,
            }}
          >
            <Text tabular tone="muted" variant="footnote">
              {pending ? 'Enviando…' : relativeTimeEs(comment.creadoEn)}
            </Text>
            {pending ? null : (
              <>
                <View>
                  <Pop trigger={comment.meGusta}>
                    <LineAction
                      accessibilityLabel={
                        comment.meGusta
                          ? `Quitar me gusta al comentario de ${comment.autor.nombre}`
                          : `Me gusta el comentario de ${comment.autor.nombre}`
                      }
                      active={comment.meGusta}
                      label="Me gusta"
                      onPress={like}
                      testID={`like-comment-${comment.id}`}
                    />
                  </Pop>
                  <Burst active={burst} color={likeHeart} radius={22} />
                </View>
                <LineAction
                  accessibilityLabel={`Responder a ${comment.autor.nombre}`}
                  label="Responder"
                  onPress={() => handlers.onReply(comment)}
                  testID={`reply-comment-${comment.id}`}
                />
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * Un comentario con sus respuestas. Las respuestas van indentadas, con la cara
 * más pequeña y una línea de hilo que baja desde el avatar; plegadas tras
 * «Ver N respuestas» hasta que se abren (o hasta que respondes tú).
 */
export function CommentThread({
  comment,
  handlers,
  expanded,
  onToggle,
  maxReplies,
}: {
  comment: RoutineComment;
  handlers: CommentHandlers;
  expanded: boolean;
  onToggle: () => void;
  /** En la vista previa del detalle los hilos no se abren ahí: «Ver N respuestas» lleva a la pantalla. */
  maxReplies?: number;
}) {
  const motion = useListMotion();
  const replies = comment.respuestas;
  const shown = expanded && maxReplies !== 0 ? replies : [];
  const canExpand = replies.length > 0;
  return (
    <Animated.View entering={motion.entering} layout={motion.layout} style={{ gap: spacing.sm }}>
      <CommentBubble comment={comment} handlers={handlers} reply={false} />
      {canExpand ? (
        <View style={{ flexDirection: 'row' }}>
          {/* Línea de hilo: baja desde el centro del avatar del comentario. */}
          <View style={{ width: AVATAR + spacing.sm, alignItems: 'center' }}>
            <View style={{ flex: 1, width: 2, borderRadius: radii.full, backgroundColor: threadLine, marginRight: spacing.sm }} />
          </View>
          <View style={{ flex: 1, gap: spacing.sm }}>
            {shown.map((reply) => (
              <Animated.View entering={motion.entering} key={reply.id} layout={motion.layout}>
                <CommentBubble comment={reply} handlers={handlers} reply />
              </Animated.View>
            ))}
            <PressableScale
              accessibilityLabel={
                expanded ? 'Ocultar respuestas' : `Ver ${replies.length} ${replies.length === 1 ? 'respuesta' : 'respuestas'}`
              }
              accessibilityState={{ expanded }}
              haptic="selection"
              onPress={onToggle}
              scaleTo={0.96}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: minTouchTarget - 12, alignSelf: 'flex-start' }}
              testID={`toggle-replies-${comment.id}`}
            >
              <Ionicons color={colors.textSecondary} name={expanded ? 'chevron-up' : 'return-down-forward'} size={iconSizes.sm} />
              <Text strong tone="secondary" variant="footnote">
                {expanded
                  ? 'Ocultar respuestas'
                  : `Ver ${replies.length} ${replies.length === 1 ? 'respuesta' : 'respuestas'}`}
              </Text>
            </PressableScale>
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
}
