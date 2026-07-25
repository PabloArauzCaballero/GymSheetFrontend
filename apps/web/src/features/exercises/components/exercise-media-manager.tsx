'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { ExerciseMedia } from '@/shared/api/contracts';
import { exerciseService } from '@/features/exercises/services/exercise-service';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';

export function ExerciseMediaManager({
  exerciseId,
  media,
}: Readonly<{ exerciseId: string; media: ExerciseMedia[] }>) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['exercise', exerciseId] });
  const create = useMutation({
    mutationFn: (form: FormData) =>
      exerciseService.addMedia(exerciseId, {
        mediaType: String(form.get('mediaType')) as 'IMAGE' | 'GIF' | 'VIDEO',
        provider: 'EXTERNAL_URL',
        url: String(form.get('url')),
        thumbnailUrl: String(form.get('thumbnailUrl') || '') || null,
        mimeType: String(form.get('mimeType') || '') || null,
        altText: String(form.get('altText')),
        isPrimary: form.get('isPrimary') === 'on',
        sortOrder: Number(form.get('sortOrder') || 0),
        metadata: {},
      }),
    onSuccess: async () => {
      await refresh();
      setOpen(false);
      toast.success('Medio agregado.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: exerciseService.removeMedia,
    onSuccess: async () => {
      await refresh();
      toast.success('Medio retirado.');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card>
      <CardHeader
        title="Medios"
        description="Registra referencias HTTPS. El backend limita cantidad, consistencia MIME y medio principal."
        action={
          <Dialog onOpenChange={setOpen} open={open}>
            <DialogTrigger asChild>
              <Button>
                <ImagePlus className="size-4" />
                Agregar
              </Button>
            </DialogTrigger>
            <DialogContent
              title="Agregar medio"
              description="Solo se crea una referencia; este frontend no sube archivos directamente."
            >
              <form action={(form) => create.mutate(form)} className="grid gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Tipo">
                    <Select name="mediaType">
                      <option value="IMAGE">Imagen</option>
                      <option value="GIF">GIF</option>
                      <option value="VIDEO">Video</option>
                    </Select>
                  </Field>
                  <Field label="Orden">
                    <Input defaultValue="0" min="0" max="1000" name="sortOrder" type="number" />
                  </Field>
                </div>
                <Field label="URL HTTPS">
                  <Input name="url" required type="url" pattern="https://.*" />
                </Field>
                <Field label="Miniatura HTTPS">
                  <Input name="thumbnailUrl" type="url" pattern="https://.*" />
                </Field>
                <Field label="MIME opcional">
                  <Input name="mimeType" placeholder="image/webp" />
                </Field>
                <Field label="Texto alternativo">
                  <Input minLength={3} maxLength={500} name="altText" required />
                </Field>
                <label className="flex items-center gap-3 text-sm">
                  <input className="size-4 accent-[var(--volt)]" name="isPrimary" type="checkbox" />
                  Usar como medio principal
                </label>
                <div className="flex justify-end gap-2">
                  <DialogClose asChild>
                    <Button type="button" variant="ghost">
                      Cancelar
                    </Button>
                  </DialogClose>
                  <Button loading={create.isPending} type="submit" variant="primary">
                    Guardar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <CardContent>
        {media.length ? (
          <div className="grid gap-3">
            {media.map((entry) => (
              <div
                className="flex items-center justify-between gap-4 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-3"
                key={entry.id}
              >
                <div className="min-w-0">
                  <div className="flex gap-2">
                    <Badge>{entry.mediaType}</Badge>
                    {entry.isPrimary ? <Badge tone="success">Principal</Badge> : null}
                  </div>
                  <p className="mt-2 truncate text-sm text-[var(--text-muted)]">{entry.altText}</p>
                </div>
                <Button
                  aria-label={`Retirar ${entry.altText}`}
                  loading={remove.isPending}
                  onClick={() => remove.mutate(entry.id)}
                  size="icon"
                  variant="ghost"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">No hay medios registrados.</p>
        )}
      </CardContent>
    </Card>
  );
}
