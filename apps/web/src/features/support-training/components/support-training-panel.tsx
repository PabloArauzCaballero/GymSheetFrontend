'use client';

import { useQuery } from '@tanstack/react-query';
import { Dumbbell } from 'lucide-react';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';
import { formatDateTime } from '@/shared/lib/date';
import { supportTrainingService } from '@/features/support-training/services/support-training-service';
import { ProgramCard } from './program-card';
import { supportKey } from './recompute-week-button';
import { label, SHARE_STATUS_LABEL } from './support-labels';

function Section({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-[-0.02em]">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Lo que soporte necesita para contestar «perdí mi multiplicador» o «no veo la
 * rutina que me compartieron» sin tocar SQL: programas con sus semanas, bonos,
 * invitaciones y las últimas sesiones.
 */
export function SupportTrainingPanel({
  userId,
  displayName,
  canRespond,
}: Readonly<{ userId: string; displayName: string | null; canRespond: boolean }>) {
  const training = useQuery({
    queryKey: supportKey(userId),
    queryFn: () => supportTrainingService.training(userId),
  });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        description="Programas, semanas, bonos, invitaciones y últimas sesiones de esta persona."
        eyebrow="Soporte"
        title={displayName ? `Entrenamiento de ${displayName}` : 'Entrenamiento del socio'}
      />

      {training.isPending ? (
        <div aria-busy="true" className="h-64 animate-pulse rounded-[8px] bg-[var(--surface-low)]" />
      ) : training.isError ? (
        <ErrorPanel message={training.error.message} onRetry={() => void training.refetch()} />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Puntos de modo', training.data.puntosDeModo],
              ['Rutinas', training.data.rutinas.total],
              ['Rutinas públicas', training.data.rutinas.publicas],
              ['Rutinas ocultas', training.data.rutinas.ocultas],
            ].map(([name, value]) => (
              <div className="panel p-4" key={name}>
                <dt className="text-xs text-[var(--text-muted)]">{name}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>

          <Section title="Programas">
            {training.data.programas.length === 0 ? (
              <EmptyState
                description="Esta persona no ha activado ningún programa."
                icon={<Dumbbell className="size-6" />}
                title="Sin programas"
              />
            ) : (
              training.data.programas.map((program) => (
                <ProgramCard
                  canRespond={canRespond}
                  key={program.id}
                  program={program}
                  userId={userId}
                />
              ))
            )}
          </Section>

          <Section title="Invitaciones recibidas">
            {training.data.invitaciones.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No le han compartido ninguna rutina.</p>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <ul>
                    {training.data.invitaciones.map((invite) => (
                      <li
                        className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] p-4 last:border-b-0"
                        key={invite.id}
                      >
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold">{invite.rutinaNombre}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            De parte de {invite.deParte} · {formatDateTime(invite.creadaEn)}
                          </p>
                        </div>
                        <Badge tone={invite.estado === 'PENDING' ? 'warning' : 'neutral'}>
                          {label(SHARE_STATUS_LABEL, invite.estado)}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </Section>

          <Section title="Últimas sesiones">
            {training.data.ultimasSesiones.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">Todavía no ha registrado sesiones.</p>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <ul>
                    {training.data.ultimasSesiones.map((session) => (
                      <li
                        className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] p-4 text-sm last:border-b-0"
                        key={session.id}
                      >
                        <span>{formatDateTime(session.inicio)}</span>
                        <span className="text-[var(--text-muted)]">
                          {session.series === 1 ? '1 serie' : `${session.series} series`} ·{' '}
                          {session.fin ? 'terminada' : 'sin terminar'}
                          {session.programaId ? ' · dentro de un programa' : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
