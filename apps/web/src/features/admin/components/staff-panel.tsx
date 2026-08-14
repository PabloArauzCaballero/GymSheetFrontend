'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { UserCog } from 'lucide-react';
import { notify } from '@/shared/notifications';
import { facilitiesAdminService } from '@/features/admin/services/facilities-admin-service';
import { membershipAdminService } from '@/features/admin/services/membership-admin-service';
import { queryKeys } from '@/shared/api/query-keys';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';

export function StaffPanel() {
  const branches = useQuery({
    queryKey: queryKeys.admin.branches(1),
    queryFn: () => facilitiesAdminService.listBranches(1),
  });
  const create = useMutation({
    mutationFn: (form: FormData) =>
      membershipAdminService.createStaff({
        usuarioId: String(form.get('usuarioId')),
        cargo: String(form.get('cargo')) as 'COACH' | 'FRONT_DESK' | 'ADMINISTRATION',
        contratadoEl: String(form.get('contratadoEl')),
        accesoIlimitado: form.get('accesoIlimitado') === 'on',
        sedes: [String(form.get('sedeId'))],
      }),
    onSuccess: () => notify.success('Perfil de personal creado.'),
    onError: (error: Error) => notify.error(error),
  });
  const update = useMutation({
    mutationFn: (form: FormData) =>
      membershipAdminService.updateStaffStatus(String(form.get('usuarioId')), {
        estadoLaboral: String(form.get('estadoLaboral')) as 'ACTIVE' | 'SUSPENDED' | 'TERMINATED',
        terminadoEl: String(form.get('terminadoEl') || '') || null,
      }),
    onSuccess: () => notify.success('Estado laboral actualizado.'),
    onError: (error: Error) => notify.error(error),
  });
  return (
    <section className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader
          description="El backend no expone un buscador general de usuarios; por eso el UUID debe provenir de un flujo autorizado."
          title="Crear perfil de personal"
        />
        <CardContent>
          <form action={(form) => create.mutate(form)} className="grid gap-5">
            <Field label="UUID de usuario">
              <Input name="usuarioId" required />
            </Field>
            <Field label="Cargo">
              <Select name="cargo">
                <option value="COACH">COACH</option>
                <option value="FRONT_DESK">FRONT_DESK</option>
                <option value="ADMINISTRATION">ADMINISTRATION</option>
              </Select>
            </Field>
            <Field label="Fecha de contratación">
              <Input name="contratadoEl" required type="date" />
            </Field>
            <Field label="Sede">
              <Select name="sedeId" required>
                {branches.data?.items.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <label className="flex items-center gap-3 text-sm">
              <input
                className="size-4 accent-[var(--volt)]"
                defaultChecked
                name="accesoIlimitado"
                type="checkbox"
              />
              Acceso ilimitado
            </label>
            <Button loading={create.isPending} type="submit" variant="primary">
              <UserCog className="size-4" />
              Crear perfil
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader
          description="La fecha de terminación es opcional y debe acompañar el estado cuando corresponda."
          title="Cambiar estado laboral"
        />
        <CardContent>
          <form action={(form) => update.mutate(form)} className="grid gap-5">
            <Field label="UUID de usuario">
              <Input name="usuarioId" required />
            </Field>
            <Field label="Estado laboral">
              <Select name="estadoLaboral">
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="TERMINATED">TERMINATED</option>
              </Select>
            </Field>
            <Field label="Fecha de terminación">
              <Input name="terminadoEl" type="date" />
            </Field>
            <Button loading={update.isPending} type="submit">
              Actualizar estado
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
