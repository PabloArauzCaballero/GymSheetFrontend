'use client';

import { businessChatCopy, businessChatFailure, startBusinessChatGate, type BusinessChatFailure } from '@gymsheet/domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import { Button, ButtonLink } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/cn';
import { businessChatService } from '../services/business-chat-client';

type Viewer = 'person' | 'business' | 'anonymous';

/**
 * «Escribir» on a business profile or listing (franja 8f): opens (or gets back)
 * the person's chat with that business and goes to it. Hidden from business
 * accounts (they only answer); a visitor signs in first and comes back here.
 * A refusal stays next to the button with what happened and what to do.
 */
export function WriteToBusinessButton({
  entityId,
  viewer,
  returnTo,
  variant = 'primary',
  className,
}: Readonly<{ entityId: string; viewer: Viewer; returnTo: string; variant?: 'primary' | 'secondary'; className?: string }>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [failure, setFailure] = useState<BusinessChatFailure | null>(null);
  const open = useMutation({
    mutationFn: () => businessChatService.open(entityId),
    onMutate: () => setFailure(null),
    onSuccess: async ({ conversationId }) => {
      // A new chat must be in the list the thread reads its header from.
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
      router.push(`/chat/${conversationId}`);
    },
    onError: (error) => setFailure(businessChatFailure(error)),
  });
  const gate = startBusinessChatGate(viewer);
  if (gate === 'hidden') return null;
  if (gate === 'sign-in') {
    return (
      <ButtonLink className={cn('w-full', className)} href={`/login?returnTo=${encodeURIComponent(returnTo)}`} variant={variant}>
        <MessageCircle aria-hidden className="size-5" />
        {businessChatCopy.signIn}
      </ButtonLink>
    );
  }
  return (
    <div className={cn('grid gap-2', className)}>
      <Button
        aria-describedby={failure ? 'write-to-business-failure' : undefined}
        className="w-full"
        loading={open.isPending || open.isSuccess}
        onClick={() => open.mutate()}
        type="button"
        variant={variant}
      >
        {open.isPending || open.isSuccess ? null : <MessageCircle aria-hidden className="size-5" />}
        {open.isPending || open.isSuccess ? businessChatCopy.writing : businessChatCopy.write}
      </Button>
      {failure ? (
        <div
          className="grid gap-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3"
          id="write-to-business-failure"
          role="alert"
        >
          <p className="t-subhead font-semibold">{failure.title}</p>
          <p className="t-footnote text-[var(--text-muted)]">{failure.message}</p>
          {failure.next === 'verify-email' ? (
            <Link className="t-footnote inline-flex min-h-11 w-fit items-center font-semibold underline underline-offset-4 hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]" href="/verificar-correo">
              Verificar mi correo
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
