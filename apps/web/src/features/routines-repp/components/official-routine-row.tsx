'use client';

import { Award, BarChart3, Flag } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { formatDate } from '@/shared/lib/date';
import {
  MODERATION_STATE_LABEL,
  type AdminRoutine,
} from '@/features/routines-repp/services/routines-repp-service';

/** Una rutina del catálogo con lo que decide si puede ser oficial. */
export function OfficialRoutineRow({
  routine,
  busy,
  onInsights,
  onToggleOfficial,
}: Readonly<{
  routine: AdminRoutine;
  busy: boolean;
  onInsights: () => void;
  onToggleOfficial: () => void;
}>) {
  const canMark =
    routine.esOficial ||
    (routine.visibilidad === 'PUBLIC' && routine.estadoModeracion === 'VISIBLE');
  return (
    <li className="flex flex-col gap-3 border-b border-[var(--border-subtle)] p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="break-words text-sm font-semibold">{routine.nombre}</p>
          {routine.esOficial ? (
            <Badge tone="success">
              <Award aria-hidden className="mr-1 inline size-3" />
              Recomendada por REPP
            </Badge>
          ) : null}
          {routine.estadoModeracion === 'VISIBLE' ? null : (
            <Badge tone="warning">{MODERATION_STATE_LABEL[routine.estadoModeracion]}</Badge>
          )}
          {routine.denunciasAbiertas > 0 ? (
            <Badge tone="danger">
              <Flag aria-hidden className="mr-1 inline size-3" />
              {routine.denunciasAbiertas === 1
                ? '1 denuncia abierta'
                : `${routine.denunciasAbiertas} denuncias abiertas`}
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {routine.autorNombre} · {routine.copias === 1 ? '1 copia' : `${routine.copias} copias`}
          {routine.valoracionPromedio === null
            ? ''
            : ` · ${routine.valoracionPromedio.toFixed(1)} de 5 (${routine.valoracionTotal})`}
          {routine.publicadaEn ? ` · publicada el ${formatDate(routine.publicadaEn)}` : ' · sin publicar'}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button onClick={onInsights} size="sm" variant="ghost">
          <BarChart3 aria-hidden className="size-4" />
          Métricas
        </Button>
        <Button
          disabled={!canMark}
          loading={busy}
          onClick={onToggleOfficial}
          size="sm"
          title={canMark ? undefined : 'Sólo una rutina pública y visible puede ser oficial.'}
          variant={routine.esOficial ? 'secondary' : 'primary'}
        >
          {routine.esOficial ? 'Quitar de oficiales' : 'Marcar como oficial'}
        </Button>
      </div>
    </li>
  );
}
