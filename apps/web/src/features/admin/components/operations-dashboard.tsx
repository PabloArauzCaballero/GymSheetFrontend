'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Dumbbell, DoorOpen, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Select } from '@/shared/components/ui/select';
import {
  insightsService,
  type LapsedMember,
  type PeopleFlowRow,
} from '@/features/admin/services/insights-service';

const WINDOWS = [
  { value: 7, label: 'Últimos 7 días' },
  { value: 30, label: 'Últimos 30 días' },
  { value: 90, label: 'Últimos 90 días' },
];

/** Barra proporcional al mayor de la serie, no al total. */
function Bar({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-high)]">
      <div className="h-full rounded-full bg-[var(--volt)]" style={{ width: `${width}%` }} />
    </div>
  );
}

/**
 * Flujo diario, en dos series superpuestas.
 *
 * La app y la puerta se dibujan juntas porque el valor está en la diferencia:
 * mucha entrada y poco entreno registrado significa que la gente no está usando
 * la aplicación, no que no entrene. Por separado, cada barra invita a la
 * conclusión contraria.
 */
function FlowChart({ rows }: { rows: PeopleFlowRow[] }) {
  const max = Math.max(1, ...rows.map((row) => Math.max(row.entradas, row.sesionesApp)));
  return (
    <div className="flex items-end gap-1 overflow-x-auto pb-2">
      {rows.map((row) => (
        <div className="flex min-w-[26px] flex-1 flex-col items-center gap-1" key={row.dia}>
          <div className="flex h-32 w-full items-end justify-center gap-[2px]">
            <div
              className="w-1/2 rounded-t bg-[var(--volt)]"
              style={{ height: `${(row.sesionesApp / max) * 100}%` }}
              title={`${row.sesionesApp} entrenos en la app`}
            />
            <div
              className="w-1/2 rounded-t bg-[var(--text-muted)]"
              style={{ height: `${(row.entradas / max) * 100}%` }}
              title={`${row.entradas} entradas al gimnasio`}
            />
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">{row.dia.slice(8)}</span>
        </div>
      ))}
    </div>
  );
}

function LapsedRow({ member }: { member: LapsedMember }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[var(--text)]">
          {member.nombreCompleto}
        </p>
        <p className="truncate text-xs text-[var(--text-muted)]">
          {member.telefono ? `${member.email} · ${member.telefono}` : member.email}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {member.vencioEl ? (
          <>
            <p className="text-xs text-[var(--text-muted)]">{member.plan ?? 'Sin plan'}</p>
            <Badge tone="warning">
              {member.diasVencido && member.diasVencido > 0
                ? `Vencida hace ${member.diasVencido} días`
                : 'Vencida'}
            </Badge>
          </>
        ) : (
          <Badge tone="neutral">Nunca tuvo membresía</Badge>
        )}
      </div>
    </div>
  );
}

/**
 * Panel de operación del gimnasio.
 *
 * Tres preguntas, en el orden en que cuestan dinero: qué máquinas se usan
 * —porque de ahí sale la próxima compra—, cuánta gente entra y cuánta registra
 * su entreno, y a quién hay que llamar hoy porque dejó de pagar.
 */
export function OperationsDashboard() {
  const [days, setDays] = useState(30);

  const usage = useQuery({
    queryKey: ['admin', 'insights', 'equipment', days],
    queryFn: () => insightsService.equipmentUsage(days),
  });
  const flow = useQuery({
    queryKey: ['admin', 'insights', 'flow', days],
    queryFn: () => insightsService.peopleFlow(Math.min(days, 30)),
  });
  const lapsed = useQuery({
    queryKey: ['admin', 'insights', 'lapsed'],
    queryFn: () => insightsService.lapsed(50),
  });

  const maxSeries = Math.max(1, ...(usage.data ?? []).map((row) => row.series));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Operación"
        tutorialId="page:admin-operacion"
        description="Uso de máquinas, flujo de personas y quién dejó de renovar."
        actions={
          <Select
            aria-label="Ventana de tiempo"
            onChange={(event) => setDays(Number(event.target.value))}
            value={days}
          >
            {WINDOWS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        }
      />

      <Card>
        <CardHeader
          title="Uso de máquinas"
          description="Series registradas. Cuando un ejercicio no tiene máquina asignada se agrupa por ejercicio."
        />
        <CardContent className="flex flex-col gap-3">
          {usage.isPending ? (
            <div className="h-32 animate-pulse rounded-[8px] bg-[var(--surface-low)]" />
          ) : (usage.data ?? []).length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              Todavía no hay series registradas en esta ventana.
            </p>
          ) : (
            (usage.data ?? []).map((row) => (
              <div className="flex flex-col gap-1" key={`${row.equipoId ?? row.nombre}`}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2 text-[var(--text)]">
                    <Dumbbell className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                    <span className="truncate">{row.nombre}</span>
                    {row.equipoId ? null : (
                      <span className="shrink-0 text-xs text-[var(--text-muted)]">
                        (sin máquina asignada)
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 tabular-nums text-[var(--text-muted)]">
                    {`${row.series} series · ${row.personas} personas`}
                  </span>
                </div>
                <Bar max={maxSeries} value={row.series} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Flujo de personas"
          description="Entrenos registrados en la app frente a entradas al gimnasio, día a día."
        />
        <CardContent className="flex flex-col gap-3">
          <div className="flex gap-4 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <Smartphone className="h-3 w-3" />
              <span className="inline-block h-2 w-3 rounded-sm bg-[var(--volt)]" /> App
            </span>
            <span className="flex items-center gap-1">
              <DoorOpen className="h-3 w-3" />
              <span className="inline-block h-2 w-3 rounded-sm bg-[var(--text-muted)]" /> Entradas
            </span>
          </div>
          {flow.isPending ? (
            <div className="h-32 animate-pulse rounded-[8px] bg-[var(--surface-low)]" />
          ) : (
            <FlowChart rows={flow.data ?? []} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="No han renovado"
          description="Incluye a quien nunca tuvo membresía: para recepción es la misma llamada."
        />
        <CardContent className="flex flex-col">
          {lapsed.isPending ? (
            <div className="h-32 animate-pulse rounded-[8px] bg-[var(--surface-low)]" />
          ) : (lapsed.data ?? []).length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <AlertTriangle className="h-4 w-4" />
              Nadie pendiente. Todas las membresías están vigentes.
            </p>
          ) : (
            (lapsed.data ?? []).map((member) => (
              <LapsedRow key={member.usuarioId} member={member} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
