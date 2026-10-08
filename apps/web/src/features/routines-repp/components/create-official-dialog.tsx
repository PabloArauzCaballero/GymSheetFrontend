'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { notify } from '@/shared/notifications';
import { routinesReppService } from '@/features/routines-repp/services/routines-repp-service';
import { OfficialDayEditor } from './official-day-editor';
import { draftToInput, emptyDraft, validateDraft, type OfficialDraft } from './official-form-model';

export const reppListKey = ['sistema', 'rutinas-repp', 'lista'] as const;

/**
 * «Crear oficial»: un formulario simple, no el asistente del móvil.
 *
 * El asistente vive en la aplicación del socio y depende de su estado local; lo
 * que el backend pide aquí es el mismo cuerpo (`nombre` y `dias`), y un
 * formulario de una pantalla basta para que la plataforma publique sin tocar la
 * base. El backend crea la rutina, la publica y la marca como oficial en un
 * solo paso.
 */
export function CreateOfficialDialog({ onClose }: Readonly<{ onClose: () => void }>) {
  const [draft, setDraft] = useState<OfficialDraft>(emptyDraft);
  const [problem, setProblem] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: () => routinesReppService.createOfficial(draftToInput(draft)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: reppListKey });
      notify.success('Rutina oficial creada y publicada.');
      onClose();
    },
    onError: (error: Error) => notify.error(error),
  });

  const submit = () => {
    const found = validateDraft(draft);
    setProblem(found);
    if (!found) create.mutate();
  };

  return (
    <Dialog onOpenChange={(open) => (open ? undefined : onClose())} open>
      <DialogContent
        className="max-w-2xl"
        description="Se publica y queda marcada como «Recomendada por REPP» al guardar."
        title="Crear rutina oficial"
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Field label="Nombre">
            <Input
              maxLength={160}
              onChange={(event) => setDraft({ ...draft, nombre: event.target.value })}
              value={draft.nombre}
            />
          </Field>
          <Field label="Descripción (opcional)">
            <Textarea
              maxLength={4000}
              onChange={(event) => setDraft({ ...draft, descripcion: event.target.value })}
              rows={2}
              value={draft.descripcion}
            />
          </Field>

          {draft.dias.map((day, index) => (
            <OfficialDayEditor
              day={day}
              index={index}
              key={day.key}
              onChange={(next) =>
                setDraft({ ...draft, dias: draft.dias.map((d) => (d.key === day.key ? next : d)) })
              }
              onRemove={() =>
                setDraft({ ...draft, dias: draft.dias.filter((d) => d.key !== day.key) })
              }
            />
          ))}

          {draft.dias.length < 7 ? (
            <Button
              className="w-fit"
              onClick={() =>
                setDraft({
                  ...draft,
                  dias: [
                    ...draft.dias,
                    { key: crypto.randomUUID(), diaSemana: null, nombre: '', ejercicios: [] },
                  ],
                })
              }
              type="button"
              variant="secondary"
            >
              <Plus aria-hidden className="size-4" />
              Añadir día
            </Button>
          ) : null}

          {problem ? (
            <p className="text-sm text-[var(--danger-text)]" role="alert">
              {problem}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button onClick={onClose} type="button" variant="ghost">
              Cancelar
            </Button>
            <Button loading={create.isPending} type="submit" variant="primary">
              Crear y publicar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
