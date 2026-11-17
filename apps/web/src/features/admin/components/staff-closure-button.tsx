'use client';

import { staffClosureCopy, staffClosureErrorMessage } from '@gymsheet/domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { confirm, notify } from '@/shared/notifications';
import { staffClosureService } from '@/features/admin/services/staff-closure-service';

/**
 * «Cerrar cuenta» on a staff row: a confirmation that says what is erased and
 * what stays, then `POST /admin/users/:id/close`. Each refusal is said by its
 * code next to the button, where the admin is looking.
 */
export function StaffClosureButton({ userId, name }: Readonly<{ userId: string; name: string }>) {
  const queryClient = useQueryClient();
  const [failure, setFailure] = useState<string | null>(null);
  const close = useMutation({
    mutationFn: () => staffClosureService.close(userId),
    onSuccess: async () => {
      setFailure(null);
      notify.success(staffClosureCopy.closed(name));
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error: Error) => setFailure(staffClosureErrorMessage(error)),
  });

  async function ask() {
    const answer = await confirm({
      title: staffClosureCopy.confirmTitle(name),
      message: staffClosureCopy.confirmMessage,
      severity: 'danger',
      confirmLabel: staffClosureCopy.confirmLabel,
    });
    if (answer.confirmed) close.mutate();
  }

  return (
    <div className="grid justify-items-start gap-1">
      <Button loading={close.isPending} onClick={() => void ask()} size="sm" variant="danger">
        {staffClosureCopy.action}
        <span className="sr-only"> de {name}</span>
      </Button>
      {failure ? (
        <p className="max-w-[240px] text-xs text-[var(--danger-text)]" role="alert">
          {failure}
        </p>
      ) : null}
    </div>
  );
}
