'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldBan } from 'lucide-react';
import { socialService } from '@/features/social/services/social-service';
import { directoryKeys } from '@/features/social/services/directory-keys';
import { queryKeys } from '@/shared/api/query-keys';
import { Button } from '@/shared/components/ui/button';
import { confirm, notify } from '@/shared/notifications';

export function BlockMemberButton({
  userId,
  displayName,
  onBlocked,
}: Readonly<{ userId: string; displayName: string; onBlocked?: () => void }>) {
  const queryClient = useQueryClient();
  const block = useMutation({
    mutationFn: () => socialService.blockUser(userId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: directoryKeys.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.connections }),
        queryClient.invalidateQueries({ queryKey: ['chat'] }),
        queryClient.invalidateQueries({ queryKey: ['gym-directory', 'blocked-users'] }),
      ]);
      notify.success(`${displayName} quedó bloqueado.`);
      onBlocked?.();
    },
    onError: (error: Error) => notify.error(error),
  });

  async function handleBlock() {
    const result = await confirm({
      title: `Bloquear a ${displayName}`,
      message: 'Se cerrará cualquier chat y dejarán de aparecer en el mapa, el directorio y el descubrimiento. Puedes desbloquearle desde Personas bloqueadas.',
      severity: 'danger',
      confirmLabel: 'Bloquear',
      cancelLabel: 'Cancelar',
    });
    if (result.confirmed) block.mutate();
  }

  return (
    <Button className="w-full" loading={block.isPending} onClick={handleBlock} variant="danger">
      <ShieldBan aria-hidden className="size-4" />
      Bloquear a {displayName}
    </Button>
  );
}
