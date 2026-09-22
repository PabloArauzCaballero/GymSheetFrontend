'use client';

import { useMutation } from '@tanstack/react-query';
import { Flag } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Field } from '@/shared/components/ui/field';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { notify } from '@/shared/notifications';
import {
  moderationReasons,
  moderationService,
  REASON_LABEL,
  type ModerationReason,
  type ModerationTargetKind,
} from '@/features/moderation/services/moderation-service';

/**
 * Denunciar contenido o a una persona.
 *
 * El motivo es una lista cerrada y no un cuadro de texto: es lo que permite
 * priorizar la cola (una denuncia por un menor no puede esperar detrás de
 * cuarenta de spam) y lo que hace que quien denuncia no tenga que redactar nada
 * para que su aviso sirva.
 *
 * Se avisa de la consecuencia inmediata —deja de aparecerte— porque es la parte
 * que le importa a quien denuncia, y prometer «lo revisaremos» sin decir cuándo
 * es lo que hace que la gente denuncie una vez y no vuelva.
 */
export function ReportDialog({
  targetKind,
  targetId,
  subjectName,
  trigger,
}: Readonly<{
  targetKind: ModerationTargetKind;
  targetId: string;
  /** Sobre quién o qué va, para decirlo en el diálogo. */
  subjectName?: string;
  trigger?: React.ReactNode;
}>) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ModerationReason>('ACOSO');
  const [details, setDetails] = useState('');

  const submit = useMutation({
    mutationFn: () =>
      moderationService.report({
        targetKind,
        targetId,
        reason,
        ...(details.trim() ? { details: details.trim() } : {}),
      }),
    onSuccess: (result) => {
      setOpen(false);
      setDetails('');
      notify.success(
        result.contentHidden
          ? 'Gracias por avisar. Retiramos el contenido mientras lo revisamos.'
          : 'Gracias por avisar. Lo revisaremos y dejará de aparecerte.',
      );
    },
    onError: (error: Error) => notify.error(error),
  });

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="ghost">
            <Flag aria-hidden className="mr-1 size-4" />
            Reportar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        description={
          subjectName
            ? `Cuéntanos qué pasa con ${subjectName}. Nadie sabrá que fuiste tú.`
            : 'Cuéntanos qué pasa. Nadie sabrá que fuiste tú.'
        }
        title="Reportar"
      >
        <div className="flex flex-col gap-4">
          <Field label="¿Qué ocurre?">
            <Select
              onChange={(event) => setReason(event.target.value as ModerationReason)}
              value={reason}
            >
              {moderationReasons.map((value) => (
                <option key={value} value={value}>
                  {REASON_LABEL[value]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Cuéntanos más (opcional)">
            <Textarea
              maxLength={1000}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Lo que nos ayude a entenderlo."
              rows={3}
              value={details}
            />
          </Field>

          <p className="text-xs leading-5 text-[var(--text-muted)]">
            Al enviarlo, esta persona deja de aparecerte y se deshace vuestra conexión.
            Alguien del equipo lo revisará.
          </p>

          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost">Cancelar</Button>
            </DialogClose>
            <Button
              disabled={submit.isPending}
              loading={submit.isPending}
              onClick={() => submit.mutate()}
              variant="danger"
            >
              Enviar reporte
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
