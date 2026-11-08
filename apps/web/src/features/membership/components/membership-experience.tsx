'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Flag, History, KeyRound, Play, Plus, ShieldCheck, Tags } from 'lucide-react';
import { confirm, notify } from '@/shared/notifications';
import type { MembershipPlan } from '@/shared/api/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import {
  SkeletonDetail,
  SkeletonList,
  SkeletonMetricRow,
  SkeletonScreen,
} from '@/shared/components/feedback/skeleton';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { ListCard } from '@/shared/components/mobile/nav-row';
import { Section } from '@/shared/components/mobile/section';
import { formatDate } from '@/shared/lib/date';
import { membershipService } from '../services/membership-service';
import { PlanCard } from './membership-cards';
import { randomUuid } from '@/shared/lib/uuid';

const STATUS_BADGE = {
  ACTIVE: { label: 'Activa', tone: 'success' },
  SUSPENDED: { label: 'Suspendida', tone: 'warning' },
  CANCELLED: { label: 'Cancelada', tone: 'danger' },
  EXPIRED: { label: 'Vencida', tone: 'danger' },
} as const;

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
      const decision = await confirm({
        title: type === 'EXTENSION' ? 'Añadir tiempo' : 'Solicitar plan',
        message: `Se ${type === 'EXTENSION' ? 'añadirá tiempo al' : 'solicitará el'} plan ${plan.nombre}. La membresía no se activará hasta confirmar el pago.`,
        severity: 'info',
        confirmLabel: 'Continuar',
      });
      if (!decision.confirmed) throw new Error('CANCELLED');
      const popup = window.open('about:blank', '_blank');
      if (popup) popup.opener = null;
      const input = { planId: plan.id, months: 1, idempotencyKey: randomUuid() };
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
      notify.success('Solicitud registrada. Continuarás en WhatsApp; el acceso sigue pendiente.'),
    onError: (error: Error) => {
      if (error.message !== 'CANCELLED') notify.error(error);
    },
  });
  if (projection.isLoading || accesses.isLoading || options.isLoading) {
    return compact ? (
      <SkeletonList rows={3} withAvatar={false} />
    ) : (
      <SkeletonScreen className="gap-8" label="Cargando tu membresía">
        <SkeletonMetricRow count={3} />
        <SkeletonDetail />
      </SkeletonScreen>
    );
  }
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
  const badge = status ? STATUS_BADGE[status as keyof typeof STATUS_BADGE] : null;
  const planDays = membership?.plan?.duracionDias ?? null;
  return (
    // Las secciones de `membership.tsx` del móvil, en su orden: estado actual,
    // planes disponibles, historial y accesos.
    <div className="grid gap-8">
      <Section icon={ShieldCheck} title="Estado actual">
        {membership ? (
          <div
            className={`panel grid gap-3 p-5 ${active ? 'border-[color-mix(in_srgb,var(--volt)_33%,transparent)]' : 'border-[color-mix(in_srgb,var(--warning)_33%,transparent)]'}`}
          >
            <h3 className="title-text">{membership.plan?.nombre ?? 'Mi membresía'}</h3>
            {membership.plan?.descripcion ? (
              <p className="t-subhead text-[var(--text-muted)]">{membership.plan.descripcion}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {badge ? <Badge tone={badge.tone}>{badge.label}</Badge> : null}
              {pending ? <Badge tone="warning">Pago pendiente</Badge> : null}
              {membership.diasRestantes <= 7 && active ? <Badge tone="warning">Próxima a vencer</Badge> : null}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[var(--radius-lg)] bg-[var(--surface-high)] px-4 py-4">
                <p className="t-hero">{membership.diasRestantes}</p>
                <p className="t-caption text-[var(--text-muted)]">Días restantes</p>
              </div>
              {planDays ? (
                <div className="rounded-[var(--radius-lg)] bg-[var(--surface-high)] px-4 py-4">
                  <p className="t-hero">{planDays}</p>
                  <p className="t-caption text-[var(--text-muted)]">Duración del plan (días)</p>
                </div>
              ) : null}
            </div>
            <div className="divide-y divide-[var(--border)]">
              <p className="t-subhead flex items-center justify-between gap-4 py-3">
                <span className="inline-flex items-center gap-2 text-[var(--text-muted)]">
                  <Play aria-hidden className="size-4" />
                  Inicio
                </span>
                <span className="font-medium">{formatDate(membership.iniciaEl)}</span>
              </p>
              <p className="t-subhead flex items-center justify-between gap-4 py-3">
                <span className="inline-flex items-center gap-2 text-[var(--text-muted)]">
                  <Flag aria-hidden className="size-4" />
                  Vencimiento
                </span>
                <span className="font-medium">{formatDate(membership.venceEl)}</span>
              </p>
            </div>
            {membership.plan?.beneficios.length ? (
              <ul className="m-0 grid list-none gap-2 p-0">
                {membership.plan.beneficios.map((benefit) => (
                  <li className="t-subhead flex gap-2" key={benefit}>
                    <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--accent-ink)]" />
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
                <Plus aria-hidden className="size-4" />
                Añadir meses
              </Button>
            ) : null}
          </div>
        ) : (
          <EmptyState
            description="Elige una opción para comenzar. El acceso solo se concede después de una confirmación válida."
            level={3}
            title="Aún no tienes membresía"
          />
        )}
      </Section>
      {!compact ? (
        <>
          <Section icon={Tags} title="Planes disponibles">
            {options.data?.plans.length ? (
              <div className="grid gap-4 md:grid-cols-2">
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
                level={3}
                title="Sin planes publicados"
              />
            )}
          </Section>
          <Section icon={History} title="Historial">
            {projection.data?.history.length ? (
              <ListCard className="divide-y divide-[var(--border)]">
                {projection.data.history.map((item) => (
                  <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:justify-between sm:gap-3" key={item.id}>
                    <span className="t-headline">{item.plan?.nombre ?? 'Plan'}</span>
                    <span className="t-subhead text-[var(--text-muted)]">
                      {formatDate(item.iniciaEl)} – {formatDate(item.venceEl)}
                    </span>
                  </div>
                ))}
              </ListCard>
            ) : (
              <EmptyState description="Aquí verás tus membresías anteriores." level={3} title="Sin historial" />
            )}
          </Section>
          <Section icon={KeyRound} title="Accesos">
            {accesses.data?.length ? (
              <ListCard className="divide-y divide-[var(--border)]">
                {accesses.data.map((access) => (
                  <div className="grid gap-1 py-3" key={access.code}>
                    <p className="t-headline flex items-center gap-2">{access.name}</p>
                    <p className="t-subhead text-[var(--text-muted)]">{access.description}</p>
                    <Badge className="w-fit">{access.source}</Badge>
                  </div>
                ))}
              </ListCard>
            ) : (
              <EmptyState description="No tienes derechos de acceso activos." level={3} title="Sin accesos" />
            )}
          </Section>
        </>
      ) : null}
    </div>
  );
}
