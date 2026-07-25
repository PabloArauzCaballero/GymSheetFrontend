'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { CalendarDays, Check, Clock3, ExternalLink, Plus, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import type { MembershipPlan } from '@/shared/api/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';
import { DomainImage } from '@/shared/components/media/domain-image';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { formatDate } from '@/shared/lib/date';
import { membershipService } from '../services/membership-service';

export function MembershipExperience({ compact = false }: Readonly<{ compact?: boolean }>) {
  const projection = useQuery({
    queryKey: queryKeys.membership,
    queryFn: membershipService.getMine,
  });
  const accesses = useQuery({
    queryKey: queryKeys.membershipAccesses,
    queryFn: membershipService.getAccesses,
  });
  const options = useQuery({
    queryKey: queryKeys.membershipOptions,
    queryFn: membershipService.getOptions,
  });
  const intent = useMutation({
    mutationFn: async ({ plan, type }: { plan: MembershipPlan; type: 'RENEWAL' | 'EXTENSION' }) => {
      if (
        !window.confirm(
          `${type === 'EXTENSION' ? 'Añadir tiempo al' : 'Solicitar el'} plan ${plan.nombre}? La membresía no se activará hasta confirmar el pago.`,
        )
      )
        throw new Error('CANCELLED');
      const popup = window.open('about:blank', '_blank');
      if (popup) popup.opener = null;
      const input = { planId: plan.id, months: 1, idempotencyKey: crypto.randomUUID() };
      try {
        const result =
          type === 'EXTENSION'
            ? await membershipService.extensionIntent(input)
            : await membershipService.renewalIntent(input);
        if (popup) popup.location.href = result.whatsappUrl;
        else window.location.href = result.whatsappUrl;
        return result;
      } catch (error) {
        popup?.close();
        throw error;
      }
    },
    onSuccess: () =>
      toast.success('Solicitud registrada. Continuarás en WhatsApp; el acceso sigue pendiente.'),
    onError: (error: Error) => {
      if (error.message !== 'CANCELLED') toast.error(error.message);
    },
  });
  if (projection.isLoading || accesses.isLoading || options.isLoading)
    return <LoadingPanel rows={compact ? 3 : 6} />;
  if (projection.isError || accesses.isError || options.isError)
    return (
      <ErrorPanel
        message="No pudimos cargar tu membresía y accesos."
        onRetry={() => {
          void projection.refetch();
          void accesses.refetch();
          void options.refetch();
        }}
      />
    );
  const membership = projection.data?.membership;
  const status = membership?.estado;
  const pending = projection.data?.paymentStatus === 'PENDING_PAYMENT';
  const active = status === 'ACTIVE' && membership?.vigenteHoy;
  return (
    <div className="grid gap-6">
      {membership ? (
        <Card>
          <CardHeader
            description={
              membership.plan?.descripcion ?? 'Información vigente proporcionada por el backend.'
            }
            title={membership.plan?.nombre ?? 'Mi membresía'}
          />
          <CardContent className="grid gap-5">
            <div className="flex flex-wrap gap-2">
              <Badge
                tone={
                  active
                    ? 'success'
                    : status === 'EXPIRED' || status === 'CANCELLED'
                      ? 'warning'
                      : 'neutral'
                }
              >
                {status}
              </Badge>
              {pending ? <Badge tone="warning">Pago pendiente</Badge> : null}
              {membership.diasRestantes <= 7 && active ? (
                <Badge tone="warning">Próxima a vencer</Badge>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Fact
                icon={<CalendarDays className="size-4" />}
                label="Inicio"
                value={formatDate(membership.iniciaEl)}
              />
              <Fact
                icon={<CalendarDays className="size-4" />}
                label="Vencimiento"
                value={formatDate(membership.venceEl)}
              />
              <Fact
                icon={<Clock3 className="size-4" />}
                label="Días restantes"
                value={String(membership.diasRestantes)}
              />
            </div>
            {membership.plan?.beneficios.length ? (
              <ul className="grid gap-2 border-t border-[var(--border-subtle)] pt-4 text-sm">
                {membership.plan.beneficios.map((benefit) => (
                  <li className="flex gap-2" key={benefit}>
                    <Check className="size-4 text-[var(--volt)]" />
                    {benefit}
                  </li>
                ))}
              </ul>
            ) : null}
            {active && membership.plan ? (
              <Button
                disabled={pending || intent.isPending}
                onClick={() => intent.mutate({ plan: membership.plan!, type: 'EXTENSION' })}
                variant="primary"
              >
                <Plus className="size-4" />
                Añadir meses
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          description="Elige una opción para comenzar. El acceso solo se concede después de una confirmación válida."
          title="Aún no tienes membresía"
        />
      )}
      {!compact ? (
        <>
          <section>
            <h2 className="mb-4 text-xl font-bold">
              {active ? 'Opciones compatibles' : 'Tienda de membresías'}
            </h2>
            {options.data?.plans.length ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {options.data.plans.map((plan) => (
                  <PlanCard
                    active={Boolean(active)}
                    busy={intent.isPending}
                    key={plan.id}
                    onSelect={() => intent.mutate({ plan, type: active ? 'EXTENSION' : 'RENEWAL' })}
                    plan={plan}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                description="No hay opciones comerciales disponibles en este momento."
                title="Tienda sin planes"
              />
            )}
          </section>
          <section className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Mis accesos" />
              <CardContent>
                {accesses.data?.length ? (
                  <ul className="grid gap-3">
                    {accesses.data.map((access) => (
                      <li
                        className="rounded-lg border border-[var(--border-subtle)] p-3"
                        key={access.code}
                      >
                        <p className="flex items-center gap-2 font-semibold">
                          <ShieldCheck className="size-4 text-[var(--volt)]" />
                          {access.name}
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                          {access.description}
                        </p>
                        <Badge>{access.source}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">
                    No tienes derechos de acceso activos.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="Historial" />
              <CardContent>
                {projection.data?.history.length ? (
                  <ul className="grid gap-3">
                    {projection.data.history.map((item) => (
                      <li
                        className="flex flex-col gap-1 border-b border-[var(--border-subtle)] pb-3 sm:flex-row sm:justify-between sm:gap-3"
                        key={item.id}
                      >
                        <span>{item.plan?.nombre ?? 'Plan'}</span>
                        <span className="text-sm text-[var(--text-muted)] sm:text-right">
                          {formatDate(item.iniciaEl)} – {formatDate(item.venceEl)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">Sin historial de membresías.</p>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}
    </div>
  );
}

function Fact({ icon, label, value }: Readonly<{ icon: ReactNode; label: string; value: string }>) {
  return (
    <div className="rounded-lg bg-[var(--surface-low)] p-3">
      <span className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        {icon}
        {label}
      </span>
      <strong className="mt-2 block">{value}</strong>
    </div>
  );
}

function PlanCard({
  plan,
  active,
  busy,
  onSelect,
}: Readonly<{ plan: MembershipPlan; active: boolean; busy: boolean; onSelect: () => void }>) {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-[16/9] bg-[var(--surface-low)]">
        {plan.imagen ? (
          <DomainImage
            alt={plan.imagen.altText}
            className="size-full object-cover"
            src={plan.imagen.url}
          />
        ) : (
          <div className="grid size-full place-items-center text-[var(--text-muted)]">
            Imagen no disponible
          </div>
        )}
      </div>
      <CardHeader description={plan.descripcion ?? undefined} title={plan.nombre} />
      <CardContent className="grid gap-4">
        <p className="text-2xl font-bold">
          {plan.precio?.toLocaleString('es-BO') ?? '—'}{' '}
          <span className="text-sm text-[var(--text-muted)]">{plan.moneda}</span>
        </p>
        <p className="text-sm text-[var(--text-muted)]">{plan.duracionDias} días</p>
        <ul className="grid gap-2 text-sm">
          {plan.beneficios.map((benefit) => (
            <li className="flex gap-2" key={benefit}>
              <Check className="size-4 text-[var(--volt)]" />
              {benefit}
            </li>
          ))}
        </ul>
        <Button disabled={busy} onClick={onSelect} variant="primary">
          {active ? 'Añadir meses' : 'Renovar por WhatsApp'}
          <ExternalLink className="size-4" />
        </Button>
        <p className="text-xs text-[var(--text-muted)]">
          Continuarás en WhatsApp. Esto registra una intención; no activa el acceso automáticamente.
        </p>
      </CardContent>
    </Card>
  );
}
