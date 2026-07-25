'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { exerciseAdminService } from '@/features/admin/services/exercise-admin-service';
import type { Exercise } from '@/shared/api/contracts';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';

export function GlobalExerciseEditButton({ exercise }: Readonly<{ exercise: Exercise }>) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const update = useMutation({
    mutationFn: (form: FormData) =>
      exerciseAdminService.updateGlobal(exercise.id, {
        nombre: String(form.get('nombre')),
        grupoMuscular: String(form.get('grupoMuscular')),
        descripcion: String(form.get('descripcion') || '') || null,
        bodyPart: String(form.get('bodyPart') || '') || null,
        targetMuscle: String(form.get('targetMuscle') || '') || null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['exercises'] });
      setOpen(false);
      toast.success('Ejercicio global actualizado.');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button aria-label={`Editar ${exercise.nombre}`} size="icon" variant="ghost">
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent title="Editar ejercicio global">
        <form action={(form) => update.mutate(form)} className="grid gap-5">
          <Field label="Nombre">
            <Input
              defaultValue={exercise.nombre}
              minLength={2}
              maxLength={160}
              name="nombre"
              required
            />
          </Field>
          <Field label="Grupo muscular">
            <Input
              defaultValue={exercise.grupoMuscular}
              minLength={2}
              maxLength={120}
              name="grupoMuscular"
              required
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Parte corporal">
              <Input defaultValue={exercise.bodyPart ?? ''} name="bodyPart" />
            </Field>
            <Field label="Músculo objetivo">
              <Input defaultValue={exercise.targetMuscle ?? ''} name="targetMuscle" />
            </Field>
          </div>
          <Field label="Descripción">
            <Textarea defaultValue={exercise.descripcion ?? ''} name="descripcion" />
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
