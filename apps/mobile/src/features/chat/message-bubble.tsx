import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';
import type { ChatMessage } from '@gymsheet/schemas';
import { DURATION, PREMIUM_EASING, PressableScale } from '@/components/motion';
import { reactionsAccessibilityLabel, summarizeReactions } from '@/hooks/chat-reactions';
import { replyGlyph, replyPreviewText } from '@/hooks/chat-reply';
import { formatTimeOfDay } from '@/lib/format';
import {
  chatBubbleMine,
  chatColors,
  colors,
  fontSizes,
  iconSizes,
  radii,
  readReceiptTick,
  semibold,
  settleSpring,
  spacing,
} from '@/theme';
import { bubbleInk } from './message-content';

/** Cuánto hay que deslizar la burbuja a la derecha para responder (con un toque háptico al pasarlo). */
export const SWIPE_REPLY_THRESHOLD = 64;
const BIG = 18;
const SMALL = 6;
const TAIL_W = 8;
const TAIL_H = 13;

export type Receipt = 'sent' | 'delivered' | 'read';

function Tail({ mine, color }: { mine: boolean; color: string }) {
  return (
    <Svg
      height={TAIL_H}
      pointerEvents="none"
      style={{ position: 'absolute', bottom: 0, [mine ? 'right' : 'left']: -TAIL_W + 0.5 }}
      width={TAIL_W}
    >
      <Path d={mine ? 'M0 0C0.4 6 3 10.5 8 13H0Z' : 'M8 0C7.6 6 5 10.5 0 13H8Z'} fill={color} />
    </Svg>
  );
}

function ReceiptTicks({ receipt }: { receipt: Receipt }) {
  const label = receipt === 'read' ? 'Leído' : receipt === 'delivered' ? 'Entregado' : 'Enviado';
  return (
    <Ionicons
      accessibilityLabel={label}
      color={receipt === 'read' ? readReceiptTick : chatColors.metaOnMine}
      name={receipt === 'sent' ? 'checkmark' : 'checkmark-done'}
      size={15}
    />
  );
}

/** La cita dentro de la burbuja: franja de color por autor, nombre y una línea del original. Tocarla salta a él. */
function Quote({ reply, author, ownQuote, mine, onPress }: {
  reply: NonNullable<ChatMessage['replyTo']>;
  author: string;
  /** La cita es de un mensaje mío: otro color de franja, como WhatsApp. */
  ownQuote: boolean;
  mine: boolean;
  onPress: () => void;
}) {
  const stripe = ownQuote ? chatColors.quoteMine : chatColors.quoteOther;
  const glyph = replyGlyph(reply.type);
  const { muted } = bubbleInk(mine);
  return (
    <PressableScale
      accessibilityHint={reply.available ? 'Ir al mensaje original' : undefined}
      accessibilityLabel={`Respuesta a ${author}: ${replyPreviewText(reply)}`}
      disabled={!reply.available}
      haptic="none"
      onPress={onPress}
      scaleTo={0.98}
      style={{
        flexDirection: 'row',
        overflow: 'hidden',
        marginBottom: spacing.xs,
        borderRadius: radii.sm,
        backgroundColor: chatColors.quoteFill,
      }}
      testID={`chat-quote-${reply.messageId}`}
    >
      <View style={{ width: 4, backgroundColor: stripe }} />
      <View style={{ flexShrink: 1, paddingVertical: 6, paddingHorizontal: spacing.sm, gap: 1 }}>
        <Text numberOfLines={1} style={{ color: stripe, fontSize: fontSizes.xs, fontWeight: semibold }}>{author}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {glyph ? <Ionicons color={muted} name={glyph} size={iconSizes.sm} /> : null}
          <Text
            numberOfLines={2}
            style={{ flexShrink: 1, color: muted, fontSize: fontSizes.sm, fontStyle: reply.available ? 'normal' : 'italic' }}
          >
            {replyPreviewText(reply)}
          </Text>
        </View>
      </View>
    </PressableScale>
  );
}

/**
 * Una burbuja del hilo, con la gramática de WhatsApp:
 *
 * - colita solo en la última de un grupo del mismo autor; las del medio llevan
 *   las esquinas del lado del autor apenas redondeadas;
 * - hora, «Editado» y checks dentro, abajo a la derecha (el texto les deja hueco);
 * - deslizar a la derecha responde (con háptico al pasar el umbral);
 * - la cita va arriba y las reacciones cuelgan del borde inferior.
 */
export function MessageBubble({
  message,
  mine,
  tombstone,
  groupedWithOlder,
  groupedWithNewer,
  highlighted,
  animateIn,
  reduceMotion,
  receipt,
  body,
  media,
  storyLabel,
  quoteAuthor,
  currentUserId,
  canReply,
  onReply,
  onLongPress,
  onPressQuote,
  onPressReactions,
}: {
  message: ChatMessage;
  mine: boolean;
  tombstone: boolean;
  groupedWithOlder: boolean;
  groupedWithNewer: boolean;
  highlighted: boolean;
  animateIn: boolean;
  reduceMotion: boolean;
  receipt: Receipt | null;
  /** Texto o pie de foto; `null` si el mensaje no lleva. */
  body: string | null;
  media: ReactNode;
  storyLabel: string | null;
  /** Quién escribió el mensaje citado («Tú» o el nombre). */
  quoteAuthor: string | null;
  currentUserId: string | undefined;
  canReply: boolean;
  onReply: () => void;
  onLongPress: () => void;
  onPressQuote: (messageId: string) => void;
  onPressReactions: () => void;
}) {
  const translateX = useSharedValue(0);
  const crossed = useSharedValue(false);
  const fill = tombstone ? colors.surfaceLow : mine ? chatBubbleMine() : chatColors.bubbleTheirs;
  const tail = !groupedWithNewer;
  const { text, muted } = bubbleInk(mine);
  const reactions = tombstone ? [] : summarizeReactions(message.reactions, currentUserId);
  const time = formatTimeOfDay(message.createdAt) ?? '';
  const edited = Boolean(message.editedAt) && !tombstone;
  const temporary = Boolean(message.expiresAt) && !tombstone;
  const showReceipt = mine && !tombstone && receipt;

  const tick = () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const pan = Gesture.Pan()
    .enabled(canReply && !tombstone)
    .activeOffsetX(16)
    .failOffsetY([-14, 14])
    .onUpdate((event) => {
      const x = Math.max(0, event.translationX);
      // Pasado el umbral la burbuja se resiste: se nota que ya «enganchó».
      translateX.value = x > SWIPE_REPLY_THRESHOLD ? SWIPE_REPLY_THRESHOLD + (x - SWIPE_REPLY_THRESHOLD) * 0.2 : x;
      const past = x >= SWIPE_REPLY_THRESHOLD;
      if (past !== crossed.value) {
        crossed.value = past;
        if (past) scheduleOnRN(tick);
      }
    })
    .onEnd(() => {
      if (crossed.value) scheduleOnRN(onReply);
    })
    .onFinalize(() => {
      crossed.value = false;
      translateX.value = reduceMotion ? withTiming(0, { duration: 0 }) : withSpring(0, settleSpring);
    });

  const bubbleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  const hintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [12, SWIPE_REPLY_THRESHOLD], [0, 1], 'clamp'),
    transform: [{ scale: interpolate(translateX.value, [12, SWIPE_REPLY_THRESHOLD], [0.6, 1], 'clamp') }],
  }));

  const meta = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      {temporary ? <Ionicons accessibilityLabel="Mensaje temporal" color={muted} name="timer-outline" size={12} /> : null}
      {edited ? <Text accessibilityLabel="Mensaje editado" style={{ color: muted, fontSize: fontSizes.micro }}>Editado</Text> : null}
      <Text style={{ color: muted, fontSize: fontSizes.micro, fontVariant: ['tabular-nums'] }}>{time}</Text>
      {showReceipt ? <ReceiptTicks receipt={receipt} /> : null}
    </View>
  );
  // Hueco invisible al final del texto, del ancho de la hora: así la hora cabe
  // en la última línea cuando hay sitio y baja a una línea propia cuando no.
  const spacer = `\u2003${edited ? 'Editado ' : ''}${temporary ? '\u2003' : ''}${time}${showReceipt ? '\u2003' : ''}`;

  return (
    <Animated.View
      entering={animateIn
        ? reduceMotion
          ? FadeIn.duration(1)
          : FadeInDown.duration(DURATION.quick + 80).easing(PREMIUM_EASING).withInitialValues({ transform: [{ translateY: 12 }] })
        : undefined}
      style={{
        alignSelf: 'stretch',
        // Lista invertida: el margen inferior es el hueco que se ve arriba.
        marginBottom: groupedWithOlder ? 2 : spacing.sm,
        paddingHorizontal: spacing.xs,
        paddingBottom: reactions.length ? 18 : 0,
        backgroundColor: highlighted ? chatColors.focusFlash : 'transparent',
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', left: 0, top: 0, bottom: reactions.length ? 18 : 0, justifyContent: 'center' }, hintStyle]}
      >
        <View style={{ width: 32, height: 32, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center', backgroundColor: chatColors.replyHint }}>
          <Ionicons color={colors.text} name="arrow-undo" size={iconSizes.sm} />
        </View>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%' }, bubbleStyle]}>
          <Pressable
            accessibilityActions={canReply && !tombstone ? [{ name: 'reply', label: 'Responder' }, { name: 'longpress', label: 'Más opciones' }] : [{ name: 'longpress', label: 'Más opciones' }]}
            accessibilityHint="Mantén pulsado para reaccionar, responder, copiar o eliminar"
            delayLongPress={280}
            onAccessibilityAction={(event) => (event.nativeEvent.actionName === 'reply' ? onReply() : onLongPress())}
            onLongPress={onLongPress}
            style={{
              paddingHorizontal: spacing.sm + 2,
              paddingTop: 6,
              paddingBottom: 6,
              borderRadius: BIG,
              borderTopRightRadius: mine && groupedWithOlder ? SMALL : BIG,
              borderTopLeftRadius: !mine && groupedWithOlder ? SMALL : BIG,
              borderBottomRightRadius: mine ? (tail ? 0 : SMALL) : BIG,
              borderBottomLeftRadius: !mine ? (tail ? 0 : SMALL) : BIG,
              backgroundColor: fill,
              boxShadow: chatColors.bubbleShadow,
            }}
            testID={`chat-message-${message.id}`}
          >
            {message.forwarded && !tombstone ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <Ionicons color={muted} name="arrow-redo" size={12} />
                <Text style={{ color: muted, fontSize: fontSizes.xs, fontStyle: 'italic' }}>Reenviado</Text>
              </View>
            ) : null}
            {storyLabel ? (
              <Text accessibilityLabel="Referencia a una story" style={{ color: muted, fontSize: fontSizes.xs, marginBottom: spacing.xs }}>
                {storyLabel}
              </Text>
            ) : null}
            {message.replyTo && quoteAuthor && !tombstone ? (
              <Quote author={quoteAuthor} mine={mine} ownQuote={message.replyTo.senderId === currentUserId} onPress={() => onPressQuote(message.replyTo!.messageId)} reply={message.replyTo} />
            ) : null}
            {media}
            {body ? (
              <Text style={{ color: text, fontSize: fontSizes.md, lineHeight: fontSizes.md * 1.32, marginTop: media ? spacing.xs : 0 }}>
                {body}
                <Text style={{ color: 'transparent', fontSize: fontSizes.micro }}>{spacer}</Text>
              </Text>
            ) : null}
            <View style={body ? { position: 'absolute', right: spacing.sm + 2, bottom: 5 } : { alignSelf: 'flex-end', marginTop: 2 }}>
              {meta}
            </View>
            {tail ? <Tail color={fill} mine={mine} /> : null}
          </Pressable>
          {reactions.length ? (
            <PressableScale
              accessibilityLabel={reactionsAccessibilityLabel(reactions)}
              accessibilityHint="Cambia o quita tu reacción"
              haptic="selection"
              onPress={onPressReactions}
              scaleTo={0.92}
              style={{
                position: 'absolute',
                bottom: -18,
                [mine ? 'right' : 'left']: spacing.sm,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 2,
                minHeight: 26,
                paddingHorizontal: 7,
                borderRadius: radii.full,
                borderWidth: 2,
                borderColor: colors.background,
                backgroundColor: colors.surfaceHighest,
              }}
              testID={`chat-reactions-${message.id}`}
            >
              {reactions.map((entry) => (
                <Text key={entry.emoji} style={{ fontSize: fontSizes.sm }}>{entry.emoji}</Text>
              ))}
              {reactions.reduce((total, entry) => total + entry.count, 0) > 1 ? (
                <Text style={{ color: colors.textSecondary, fontSize: fontSizes.xs, marginLeft: 2, fontVariant: ['tabular-nums'] }}>
                  {reactions.reduce((total, entry) => total + entry.count, 0)}
                </Text>
              ) : null}
            </PressableScale>
          ) : null}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
