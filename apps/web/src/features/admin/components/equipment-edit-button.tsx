'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { notify } from '@/shared/notifications';
import { equipmentAdminService } from '@/features/admin/services/equipment-admin-service';
import { equipmentTypes, type Equipment, type EquipmentType } from '@/shared/api/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';

/**
 * Corrige los datos descriptivos de una máquina ya registrada. El estado se
 * cambia desde la tabla, porque tiene consecuencias operativas inmediatas y no
 * debería quedar escondido tras un diálogo.
 */
export function EquipmentEditButton({ equipment }: Readonly<{ equipment: Equipment }>) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const update = useMutation({
    mutationFn: (form: FormData) =>
      equipmentAdminService.update(equipment.id, {
        nombre: String(form.get('nombre')).trim(),
        tipo: String(form.get('tipo')) as EquipmentType,
        descripcion: String(form.get('descripcion') || '').trim() || null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.equipment });
      setOpen(false);
      notify.success('Equipo actualizado.');
    },
    onError: (error: Error) => notify.error(error),
  });

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button aria-label={`Editar ${equipment.nombre}`} size="icon" variant="ghost">
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent title={`Editar ${equipment.nombre}`}>
        <form action={(form) => update.mutate(form)} className="grid gap-5" key={equipment.id}>
          <Field htmlFor="equipment-edit-name" label="Nombre">
            <Input
              defaultValue={equipment.nombre}
              id="equipment-edit-name"
              maxLength={140}
              minLength={2}
              name="nombre"
              required
            />
          </Field>
          <Field htmlFor="equipment-edit-type" label="Tipo">
            <Select defaultValue={equipment.tipo} id="equipment-edit-type" name="tipo">
              {equipmentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </Field>
          <Field htmlFor="equipment-edit-description" label="Descripción">
            <Textarea
              defaultValue={equipment.descripcion ?? ''}
              id="equipment-edit-description"
              maxLength={500}
              name="descripcion"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </DialogClose>
            <Button loading={update.isPending} type="submit" variant="primary">
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
