'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Link2 } from 'lucide-react';
import { notify } from '@/shared/notifications';
import { facilitiesAdminService } from '@/features/admin/services/facilities-admin-service';
import { exerciseService } from '@/features/exercises/services/exercise-service';
import { queryKeys } from '@/shared/api/query-keys';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Field } from '@/shared/components/ui/field';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';

export function EquipmentAssignmentPanel() {
  const equipment = useQuery({
    queryKey: queryKeys.equipment,
    queryFn: exerciseService.listEquipment,
  });
  const rooms = useQuery({
    queryKey: queryKeys.admin.rooms(1),
    queryFn: () => facilitiesAdminService.listRooms(1),
  });
  const assign = useMutation({
    mutationFn: (form: FormData) =>
      facilitiesAdminService.assignEquipment({
        equipoId: String(form.get('equipoId')),
        salaId: String(form.get('salaId')),
        notas: String(form.get('notas') || '') || null,
      }),
    onSuccess: () => notify.success('Equipo asignado a la sala.'),
    onError: (error: Error) => notify.error(error),
  });
  return (
    <Card>
      <CardHeader
        description="La asignación registra fecha, sala y usuario actor en el backend."
        title="Asignar equipo a sala"
      />
      <CardContent>
        <form action={(form) => assign.mutate(form)} className="grid gap-5 sm:grid-cols-2">
          <Field label="Equipo">
            <Select name="equipoId" required>
              {equipment.data?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sala">
            <Select name="salaId" required>
              {rooms.data?.items.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field className="sm:col-span-2" label="Notas">
            <Textarea name="notas" />
          </Field>
          <Button
            className="sm:col-span-2"
            loading={assign.isPending}
            type="submit"
            variant="primary"
          >
            <Link2 className="size-4" />
            Asignar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
