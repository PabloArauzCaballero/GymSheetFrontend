'use client';

import { useMutation } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { User } from 'lucide-react';
import { chatService } from '@/features/chat/services/chat-service';
import type { GymDirectoryEntry } from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import { DomainImage } from '@/shared/components/media/domain-image';
import { notify } from '@/shared/notifications';

/**
 * Celebración del match.
 *
 * Es un momento, no una pantalla: un diálogo con una sola acción dominante
 * —escribirle— y una salida evidente. La animación se limita a la entrada de
 * la foto; con `prefers-reduced-motion` la foto aparece ya colocada y el
 * diálogo sigue funcionando igual.
 */
export function MatchCelebration({
  match,
  onClose,
}: Readonly<{ match: GymDirectoryEntry | null; onClose: () => void }>) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const openChat = useMutation({
    mutationFn: (otherUserId: string) => chatService.startConversation(otherUserId),
    onSuccess: (conversation) => {
      onClose();
      router.push(`/chat/${conversation.conversationId}`);
    },
    onError: (error: Error) => notify.error(error),
  });

  if (!match) return null;
  const photo = match.photos[0]?.url ?? match.photoUrl;

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open>
      <DialogContent
        className="max-w-sm text-center"
        description={`A ${match.displayName} también le gustó tu perfil. Ya podéis escribiros.`}
        title="¡Es un match!"
      >
        <div className="grid justify-items-center gap-6">
          <motion.div
            animate={{ scale: 1, opacity: 1 }}
            className="relative size-32 overflow-hidden rounded-full border-2 border-[var(--volt)]"
            initial={reduceMotion ? { scale: 1, opacity: 1 } : { scale: 0.86, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            {photo ? (
              <DomainImage alt={`Foto de ${match.displayName}`} src={photo} />
            ) : (
              <span className="grid size-full place-items-center bg-[var(--surface-low)] text-[var(--text-disabled)]">
                <User aria-hidden className="size-12" />
              </span>
            )}
          </motion.div>
          <div className="grid w-full gap-2">
            <Button
              loading={openChat.isPending}
              onClick={() => openChat.mutate(match.userId)}
              variant="primary"
            >
              Enviar un mensaje
            </Button>
            <Button onClick={onClose} variant="ghost">
              Seguir descubriendo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
