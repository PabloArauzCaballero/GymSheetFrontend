'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EyeOff, ShieldAlert, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Textarea } from '@/shared/components/ui/textarea';
import { formatDateTime } from '@/shared/lib/date';
import { confirm, notify } from '@/shared/notifications';
import {
  moderationService,
  REASON_LABEL,
  TARGET_LABEL,
  type ModerationTargetKind,
} from '@/features/moderation/services/moderation-service';
import { queueKey, sanctionLabel } from './moderation-labels';

/**
 * El expediente y el veredicto.
 *
 * Enseña el historial y la sanción que tocaría ANTES de decidir. Es lo que
 * convierte la escalera en una regla conocida en vez de en una sorpresa: quien
 * modera ve «tiene 2 faltas activas, le tocaría una suspensión de 7 días» y
 * decide con eso delante, no después.
 */
export function CasePanel({
  targetKind,
  targetId,
  onResolved,
}: Readonly<{
  targetKind: ModerationTargetKind;
  targetId: string;
  onResolved: () => void;
}>) {
  const [note, setNote] = useState('');
  const queryClient = useQueryClient();

  const detail = useQuery({
    queryKey: ['admin', 'moderation', 'case', targetKind, targetId],
    queryFn: () => moderationService.getCase(targetKind, targetId),
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: queueKey });
    onResolved();
  };

  const claim = useMutation({
    mutationFn: () => moderationService.claim(targetKind, targetId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queueKey });
      await detail.refetch();
      notify.success('Caso asignado a ti.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const resolve = useMutation({
    mutationFn: (input: { hideContent: boolean; sanction: boolean }) =>
      moderationService.resolve(targetKind, targetId, {
        ...input,
        ...(note.trim() ? { note: note.trim() } : {}),
      }),
    onSuccess: async (result) => {
      notify.success(
        result.sanction
          ? `Resuelto. Se aplicó ${sanctionLabel(result.sanction.kind, result.sanction.days)}.`
          : 'Caso resuelto.',
      );
      setNote('');
      await refresh();
    },
    onError: (error: Error) => notify.error(error),
  });

  if (detail.isPending) {
    return <div className="h-96 animate-pulse rounded-[8px] bg-[var(--surface-low)]" />;
  }
  if (detail.isError || !detail.data) {
    return (
      <EmptyState
        description="No pudimos cargar este caso. Puede que otra persona acabe de resolverlo."
        title="Caso no disponible"
      />
    );
  }

  const data = detail.data;
  const sanctionText = sanctionLabel(
    data.pendingSanction.kind,
    data.pendingSanction.days,
  );

  const act = async (input: { hideContent: boolean; sanction: boolean }) => {
    if (input.sanction) {
      const result = await confirm({
        title: '¿Aplicar la sanción?',
        message: `A ${data.reportedUser.name} le corresponde ${sanctionText}.`,
        description:
          'La duración la fija su historial: no se puede cambiar aquí, y por eso dos personas con el mismo historial reciben lo mismo.',
        confirmLabel: 'Aplicar sanción',
        severity: 'danger',
      });
      // `confirmed` y no la ausencia de error: cerrar con Escape no es aceptar.
      if (!result.confirmed) return;
    }
    resolve.mutate(input);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-semibold tracking-[-0.02em]">
          {TARGET_LABEL[data.targetKind]} de {data.reportedUser.name}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {data.contentHidden ? (
            <Badge tone="neutral">Contenido retirado</Badge>
          ) : (
            <Badge tone="success">Visible</Badge>
          )}
          {data.reportedUser.suspendedUntil ? (
            <Badge tone="danger">
              Suspendido hasta {formatDateTime(data.reportedUser.suspendedUntil)}
            </Badge>
          ) : null}
        </div>
      </div>

      {/* El historial y la consecuencia, juntos y antes de los botones. */}
      <Card>
        <CardContent className="flex flex-col gap-2 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert aria-hidden className="size-4 text-[var(--text-muted)]" />
            {data.activeStrikes === 0
              ? 'Sin faltas activas'
              : data.activeStrikes === 1
                ? '1 falta activa'
                : `${data.activeStrikes} faltas activas`}
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Si sancionas, le corresponde <strong>{sanctionText}</strong>. La escalera es
            automática: dos personas con el mismo historial reciben lo mismo.
          </p>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-sm font-semibold">
          {data.reports.length === 1 ? '1 reporte' : `${data.reports.length} reportes`}
        </h3>
        <ul className="mt-2 flex flex-col gap-2">
          {data.reports.map((report) => (
            <li
              className="rounded-[4px] border border-[var(--border-subtle)] p-3"
              key={report.id}
            >
              <p className="text-sm font-medium">{REASON_LABEL[report.reason]}</p>
              {report.details ? (
                <p className="mt-1 text-sm text-[var(--text-muted)]">{report.details}</p>
              ) : null}
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {formatDateTime(report.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <Textarea
        aria-label="Nota interna"
        onChange={(event) => setNote(event.target.value)}
        placeholder="Nota interna (opcional): por qué decidiste esto."
        rows={2}
        value={note}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={claim.isPending}
          onClick={() => claim.mutate()}
          variant="secondary"
        >
          Tomar el caso
        </Button>
        <Button
          disabled={resolve.isPending}
          onClick={() => act({ hideContent: false, sanction: false })}
          variant="ghost"
        >
          <ShieldCheck aria-hidden className="mr-1 size-4" />
          Sin infracción
        </Button>
        <Button
          disabled={resolve.isPending}
          onClick={() => act({ hideContent: true, sanction: false })}
          variant="secondary"
        >
          <EyeOff aria-hidden className="mr-1 size-4" />
          Retirar contenido
        </Button>
        <Button
          disabled={resolve.isPending}
          onClick={() => act({ hideContent: true, sanction: true })}
          variant="danger"
        >
          <TriangleAlert aria-hidden className="mr-1 size-4" />
          Retirar y sancionar
        </Button>
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        Retirar deja de mostrar el contenido en toda la aplicación. El archivo original se
        conserva, así que la decisión se puede revisar.
      </p>
    </div>
  );
}
