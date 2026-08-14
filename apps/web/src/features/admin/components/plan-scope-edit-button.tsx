'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { notify } from '@/shared/notifications';
import { facilitiesAdminService } from '@/features/admin/services/facilities-admin-service';
import { membershipAdminService } from '@/features/admin/services/membership-admin-service';
import type { MembershipPlan, PlanScope } from '@/shared/api/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import { Select } from '@/shared/components/ui/select';

export function PlanScopeEditButton({ plan }: Readonly<{ plan: MembershipPlan }>) {
  const [open, setOpen] = useState(false);
  const [scopes, setScopes] = useState<PlanScope[]>(plan.alcances);
  const queryClient = useQueryClient();
  const branches = useQuery({
    queryKey: queryKeys.admin.branches(1),
    queryFn: () => facilitiesAdminService.listBranches(1),
  });
  const rooms = useQuery({
    queryKey: queryKeys.admin.rooms(1),
    queryFn: () => facilitiesAdminService.listRooms(1),
  });
  const update = useMutation({
    mutationFn: () => membershipAdminService.replaceScopes(plan.id, scopes),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.plans });
      setOpen(false);
      notify.success('Alcances reemplazados.');
    },
    onError: (error: Error) => notify.error(error),
  });

  function updateScope(index: number, change: Partial<PlanScope>) {
    setScopes((current) =>
      current.map((scope, position) => (position === index ? { ...scope, ...change } : scope)),
    );
  }

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setScopes(plan.alcances);
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button aria-label={`Editar alcances de ${plan.nombre}`} size="icon" variant="ghost">
          <SlidersHorizontal className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Alcances del plan"
        description="Guardar reemplaza el conjunto completo de sedes y salas autorizadas."
      >
        <div className="grid gap-4">
          {scopes.map((scope, index) => (
            <div
              className="grid gap-3 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-3 sm:grid-cols-[1fr_1fr_auto]"
              key={`${index}-${scope.sedeId}-${scope.salaId ?? 'all'}`}
            >
              <Select
                aria-label={`Sede del alcance ${index + 1}`}
                onChange={(event) =>
                  updateScope(index, { sedeId: event.target.value, salaId: null })
                }
                value={scope.sedeId}
              >
                {branches.data?.items.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.nombre}
                  </option>
                ))}
              </Select>
              <Select
                aria-label={`Sala del alcance ${index + 1}`}
                onChange={(event) => updateScope(index, { salaId: event.target.value || null })}
                value={scope.salaId ?? ''}
              >
                <option value="">Toda la sede</option>
                {rooms.data?.items
                  .filter((room) => room.sedeId === scope.sedeId)
                  .map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.nombre}
                    </option>
                  ))}
              </Select>
              <Button
                aria-label={`Quitar alcance ${index + 1}`}
                disabled={scopes.length === 1}
                onClick={() =>
                  setScopes((current) => current.filter((_, position) => position !== index))
                }
                size="icon"
                type="button"
                variant="ghost"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            disabled={!branches.data?.items.length || scopes.length >= 100}
            onClick={() => {
              const first = branches.data?.items[0];
              if (first) setScopes((current) => [...current, { sedeId: first.id, salaId: null }]);
            }}
            type="button"
          >
            <Plus className="size-4" />
            Agregar alcance
          </Button>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </DialogClose>
            <Button
              disabled={scopes.length === 0}
              loading={update.isPending}
              onClick={() => update.mutate()}
              variant="primary"
            >
              Guardar alcances
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
