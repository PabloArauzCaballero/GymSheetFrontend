'use client';

import { businessChatCopy, businessChatFailure } from '@gymsheet/domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ban } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import { notify } from '@/shared/notifications';
import { businessChatService } from '../services/business-chat-client';

/**
 * «Bloquear a esta persona» in a business thread (ADR-0023): confirms first,
 * because it closes the chat for both and there is no unblock yet. On success
 * the business goes back to its inbox; the conversation is gone from it.
 */
export function BlockPersonButton({ conversationId, personName }: Readonly<{ conversationId: string; personName: string }>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const block = useMutation({
    mutationFn: () => businessChatService.block(conversationId),
    onMutate: () => setError(null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
      notify.success(businessChatCopy.blocked);
      setOpen(false);
      router.push('/negocio/mensajes');
    },
    onError: (failure) => setError(businessChatFailure(failure).message),
  });
  return (
    <Dialog onOpenChange={(next) => !block.isPending && setOpen(next)} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" type="button" variant="ghost">
          <Ban aria-hidden className="size-4" />
          {businessChatCopy.block}
        </Button>
      </DialogTrigger>
      <DialogContent description={businessChatCopy.blockConsequence} title={businessChatCopy.blockTitle}>
        <p className="t-subhead break-words text-[var(--text-muted)]">
          Vas a bloquear a <strong className="font-semibold text-[var(--text)]">{personName}</strong>.
        </p>
        {error ? (
          <p className="t-footnote text-[var(--danger-text)]" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <Button disabled={block.isPending} type="button" variant="ghost">
              Cancelar
            </Button>
          </DialogClose>
          <Button loading={block.isPending} onClick={() => block.mutate()} type="button" variant="danger">
            {businessChatCopy.blockConfirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
