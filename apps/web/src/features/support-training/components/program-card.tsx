'use client';

import { useState } from 'react';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';
import type {
  ProgramWeek,
  RecomputeResult,
  SupportProgram,
} from '@/features/support-training/services/support-training-service';
import { RecomputeWeekButton } from './recompute-week-button';
import {
  isoDayLabel,
  label,
  LANE_LABEL,
  MODE_LABEL,
  PROGRAM_STATUS_LABEL,
  recomputeMessage,
  REWARD_REASON_LABEL,
} from './support-labels';

function WeekStatus({ week }: Readonly<{ week: ProgramWeek }>) {
  if (week.cerradaEn === null) return <Badge tone="neutral">Abierta</Badge>;
  return week.cumplida ? (
    <Badge tone="success">Cumplida</Badge>
  ) : (
    <Badge tone="warning">No cumplida</Badge>
  );
}

/** Un programa con sus semanas, su multiplicador y los bonos que ya pagó. */
export function ProgramCard({
  program,
  userId,
  canRespond,
}: Readonly<{ program: SupportProgram; userId: string; canRespond: boolean }>) {
  const [results, setResults] = useState<ReadonlyMap<number, RecomputeResult>>(new Map());

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{program.rutinaNombre ?? 'Sin rutina'}</h3>
            <Badge tone={program.estado === 'ACTIVE' ? 'success' : 'neutral'}>
              {label(PROGRAM_STATUS_LABEL, program.estado)}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {label(LANE_LABEL, program.carril)} · {label(MODE_LABEL, program.modo)} ·{' '}
            {isoDayLabel(program.fechaInicio)} → {isoDayLabel(program.fechaFinPrevista)} ·
            multiplicador ×{program.multiplicador.toFixed(2)}
          </p>
        </div>

        <ul className="flex flex-col">
          {program.semanas.map((week) => {
            const result = results.get(week.numero);
            const closedAndOpen = week.cerradaEn !== null && week.cumplida !== true;
            return (
              <li
                className="flex flex-col gap-2 border-t border-[var(--border-subtle)] py-3 first:border-t-0"
                key={week.numero}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold">Semana {week.numero}</span>
                    <WeekStatus week={week} />
                    {week.esDescarga ? <Badge tone="info">Descarga</Badge> : null}
                  </p>
                  {closedAndOpen ? (
                    <RecomputeWeekButton
                      canRespond={canRespond}
                      onResult={(number, outcome) =>
                        setResults(new Map(results).set(number, outcome))
                      }
                      programId={program.id}
                      userId={userId}
                      week={week.numero}
                    />
                  ) : null}
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  {week.sesionesHechas} de {week.sesionesPlan} sesiones
                  {week.cardioMinutos > 0 ? ` · ${week.cardioMinutos} min de cardio` : ''}
                  {week.multiplicador === null ? '' : ` · ×${week.multiplicador.toFixed(2)}`} · desde el{' '}
                  {isoDayLabel(week.inicio)}
                </p>
                {result ? (
                  <p
                    className="rounded-[4px] border border-[var(--border-subtle)] p-2 text-sm"
                    role="status"
                  >
                    {recomputeMessage(result)}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>

        <div>
          <h4 className="text-sm font-semibold">Bonos</h4>
          {program.bonos.length === 0 ? (
            <p className="mt-1 text-sm text-[var(--text-muted)]">Este programa aún no ha pagado bonos.</p>
          ) : (
            <ul className="mt-1 text-sm text-[var(--text-muted)]">
              {program.bonos.map((bono) => (
                <li key={`${bono.semana}-${bono.motivo}-${bono.creadoEn}`}>
                  Semana {bono.semana} · {label(REWARD_REASON_LABEL, bono.motivo)} · +
                  {bono.puntosBonus} puntos sobre {bono.puntosBase} (×{bono.multiplicador.toFixed(2)})
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
