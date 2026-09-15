import { useMemo, useState } from 'react';
import { Modal } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { keyOf, type CelebrationSubject } from './scene';
import { CardStage } from './stage';

/**
 * La recompensa a pantalla completa, con cola.
 *
 * Varias insignias a la vez se abren una tras otra, como un cofre: «1 de 3» y
 * «Siguiente» hasta la última. Cada carta remonta la escena (`key`) porque es
 * una secuencia que empieza en el fotograma cero; reutilizar el árbol dejaría
 * la segunda ya volteada.
 *
 * Acepta `subject` (una sola, como antes) o `subjects` (la cola).
 */
export function CelebrationModal({
  subject = null,
  subjects,
  onClose,
}: {
  subject?: CelebrationSubject | null;
  subjects?: readonly CelebrationSubject[];
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const queue = useMemo(() => subjects ?? (subject ? [subject] : []), [subject, subjects]);
  const signature = queue.map(keyOf).join('|');

  // El cursor recuerda a qué cola pertenece: si la cola cambia, empieza de cero
  // sin necesidad de un efecto que lo reinicie.
  const [cursor, setCursor] = useState({ signature: '', index: 0, take: 0 });
  const sameQueue = cursor.signature === signature;
  const index = sameQueue ? cursor.index : 0;
  const take = sameQueue ? cursor.take : 0;
  const current = queue[index] ?? null;

  const close = () => {
    setCursor({ signature: '', index: 0, take: 0 });
    onClose();
  };
  const advance = () => {
    if (index + 1 < queue.length) setCursor({ signature, index: index + 1, take: 0 });
    else close();
  };
  const replay = () => setCursor({ signature, index, take: take + 1 });

  return (
    <Modal
      // El fundido es de `Modal`: con movimiento reducido se pide `none` explícito.
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={close}
      statusBarTranslucent
      transparent
      visible={current !== null}
    >
      {current ? (
        <CardStage
          key={`${keyOf(current)}#${take}`}
          onAdvance={advance}
          onClose={close}
          onReplay={replay}
          position={index + 1}
          subject={current}
          total={queue.length}
        />
      ) : null}
    </Modal>
  );
}
