'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { notify } from '@/shared/notifications';
import { facilitiesAdminService } from '@/features/admin/services/facilities-admin-service';
import { membershipAdminService } from '@/features/admin/services/membership-admin-service';
import {
  StaffCreateForm,
  StaffLinkCard,
  positionLabels,
  todayIso,
} from './staff-forms';
import {
  employmentStatuses,
  staffPositions,
  type EmploymentStatus,
  type StaffPosition,
} from '@/shared/api/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import { Pagination } from '@/shared/components/ui/pagination';
import { Select } from '@/shared/components/ui/select';
import { Table, TableCell, TableContainer, TableHead } from '@/shared/components/ui/table';
import { formatDate } from '@/shared/lib/date';

const statusTone: Record<EmploymentStatus, 'success' | 'warning' | 'danger'> = {
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  TERMINATED: 'danger',
};

/**
 * Personal del gimnasio. El alta crea la cuenta y el perfil laboral en un solo
 * paso; el rol de autorización lo deriva el backend del cargo, de modo que la
 * consola no puede emitir permisos que no correspondan al puesto.
 */
export function StaffPanel() {
  const [page, setPage] = useState(1);
  const [position, setPosition] = useState<'' | StaffPosition>('');
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const branches = useQuery({
    queryKey: queryKeys.admin.branches(1),
    queryFn: () => facilitiesAdminService.listBranches(1),
  });
  const staff = useQuery({
    queryKey: queryKeys.admin.staff(page, position),
    queryFn: () => membershipAdminService.listStaff(page, position || undefined),
  });
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'staff'], exact: false });

  const create = useMutation({
    mutationFn: (form: FormData) =>
      membershipAdminService.createStaffUser({
        email: String(form.get('email')),
        password: String(form.get('password')),
        nombreCompleto: String(form.get('nombreCompleto')),
        cargo: String(form.get('cargo')) as StaffPosition,
        contratadoEl: String(form.get('contratadoEl')),
        accesoIlimitado: form.get('accesoIlimitado') === 'on',
        sedes: [String(form.get('sedeId'))],
        pinAcceso: String(form.get('pinAcceso') || '') || null,
      }),
    onSuccess: async () => {
      await refresh();
      setCreateOpen(false);
      notify.success('Persona registrada con su cuenta de acceso.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const link = useMutation({
    mutationFn: (form: FormData) =>
      membershipAdminService.createStaff({
        usuarioId: String(form.get('usuarioId')),
        cargo: String(form.get('cargo')) as StaffPosition,
        contratadoEl: String(form.get('contratadoEl')),
        accesoIlimitado: form.get('accesoIlimitado') === 'on',
        sedes: [String(form.get('sedeId'))],
      }),
    onSuccess: async () => {
      await refresh();
      notify.success('Perfil laboral vinculado a la cuenta existente.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const changeStatus = useMutation({
    mutationFn: ({ userId, estadoLaboral }: { userId: string; estadoLaboral: EmploymentStatus }) =>
      membershipAdminService.updateStaffStatus(userId, {
        estadoLaboral,
        // El backend exige fecha al terminar el vínculo laboral.
        terminadoEl: estadoLaboral === 'TERMINATED' ? todayIso() : null,
      }),
    onSuccess: async () => {
      await refresh();
      notify.success('Estado laboral actualizado.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const branchItems = branches.data?.items ?? [];

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Personal</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Entrenadores, recepción y administración con su alcance de sedes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Filtrar por cargo"
            className="min-w-48"
            onChange={(event) => {
              setPage(1);
              setPosition(event.target.value as '' | StaffPosition);
            }}
            value={position}
          >
            <option value="">Todos los cargos</option>
            {staffPositions.map((item) => (
              <option key={item} value={item}>
                {positionLabels[item]}
              </option>
            ))}
          </Select>
          <Dialog onOpenChange={setCreateOpen} open={createOpen}>
            <DialogTrigger asChild>
              <Button variant="primary">
                <UserPlus className="size-4" />
                Nuevo entrenador
              </Button>
            </DialogTrigger>
            <DialogContent
              description="Se crea la cuenta de acceso y el perfil laboral a la vez. El rol lo determina el cargo."
              title="Registrar persona del equipo"
            >
              <StaffCreateForm
                branches={branchItems}
                loading={create.isPending}
                onSubmit={(form) => create.mutate(form)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {staff.isError ? (
        <ErrorPanel message={staff.error.message} onRetry={() => staff.refetch()} />
      ) : staff.data?.items.length ? (
        <div className="panel overflow-hidden">
          <TableContainer>
            <Table>
              <thead>
                <tr>
                  <TableHead>Persona</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Contratación</TableHead>
                  <TableHead>Sedes</TableHead>
                  <TableHead>Estado laboral</TableHead>
                </tr>
              </thead>
              <tbody>
                {staff.data.items.map((profile) => (
                  <tr key={profile.id}>
                    <TableCell>
                      <p className="font-semibold">
                        {profile.usuario?.nombreCompleto ?? 'Cuenta sin datos'}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {profile.usuario?.email ?? profile.usuarioId}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge>{positionLabels[profile.cargo]}</Badge>
                      {profile.accesoIlimitado ? (
                        <p className="mt-1 text-xs text-[var(--text-muted)]">Acceso ilimitado</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(profile.contratadoEl)}
                    </TableCell>
                    <TableCell>{profile.sedes.length}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge tone={statusTone[profile.estadoLaboral]}>
                          {profile.estadoLaboral}
                        </Badge>
                        <Select
                          aria-label={`Estado laboral de ${profile.usuario?.nombreCompleto ?? profile.usuarioId}`}
                          className="min-w-40"
                          disabled={changeStatus.isPending}
                          onChange={(event) =>
                            changeStatus.mutate({
                              userId: profile.usuarioId,
                              estadoLaboral: event.target.value as EmploymentStatus,
                            })
                          }
                          value={profile.estadoLaboral}
                        >
                          {employmentStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableContainer>
          <Pagination
            onPageChange={setPage}
            page={staff.data.page}
            totalPages={staff.data.totalPages}
          />
        </div>
      ) : (
        <EmptyState
          description="Registra al primer entrenador con «Nuevo entrenador»."
          title="Sin personal registrado"
        />
      )}

      <StaffLinkCard
        branches={branchItems}
        loading={link.isPending}
        onSubmit={(form) => link.mutate(form)}
      />
    </section>
  );
}
