'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, Mail, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ApiError } from '@/shared/api/api-error';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Field } from '@/shared/components/ui/field';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Select } from '@/shared/components/ui/select';
import { queryKeys } from '@/shared/api/query-keys';
import {
  activationAdminService,
  membershipAdminService,
} from '@/features/admin/services/membership-admin-service';

/**
 * Activar la cuenta de alguien que pagó fuera de la aplicación.
 *
 * A esta pantalla se llega por un enlace que el propio cliente envió por
 * WhatsApp. Conviene tener claro qué protege qué: **el enlace no autoriza
 * nada**, sólo dice a quién activar. Si no hay sesión, el proxy ya mandó a
 * iniciarla y devuelve aquí; si la sesión no es de personal, el backend
 * responde 403 y esta pantalla lo dice sin rodeos. Un enlace reenviado a un
 * grupo no sirve de nada en manos ajenas.
 *
 * Se pide elegir el plan en vez de renovar el anterior automáticamente porque
 * el momento de pagar en efectivo es justo cuando la gente cambia de plan, y
 * adivinarlo mal significa cobrar de menos o dar de más.
 */
export function ActivationConfirm({ token }: { token: string }) {
  const [planId, setPlanId] = useState('');
  const [done, setDone] = useState(false);

  const request = useQuery({
    queryKey: ['admin', 'activation', token],
    queryFn: () => activationAdminService.describe(token),
    retry: false,
  });
  const plans = useQuery({
    queryKey: queryKeys.admin.plans,
    queryFn: membershipAdminService.listPlans,
  });

  const confirm = useMutation({
    mutationFn: () => activationAdminService.confirm(token, planId),
    onSuccess: () => setDone(true),
  });

  if (request.isPending) {
    return <div className="h-64 animate-pulse rounded-[8px] bg-[var(--surface-low)]" />;
  }

  if (request.isError) {
    const denied = request.error instanceof ApiError && request.error.status === 403;
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 py-8 text-center">
          <p className="text-base font-semibold text-[var(--text)]">
            {denied ? 'Tu cuenta no puede activar membresías' : 'El enlace ya no es válido'}
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            {denied
              ? 'Sólo el personal del gimnasio puede hacerlo. Inicia sesión con una cuenta de administración o recepción.'
              : 'Puede que ya se haya usado o que haya caducado. Pide al cliente que vuelva a enviarlo desde su aplicación.'}
          </p>
          <Link className="text-sm underline underline-offset-4" href="/dashboard">
            Volver al panel
          </Link>
        </CardContent>
      </Card>
    );
  }

  const detail = request.data;

  if (done) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <CheckCircle2 className="h-10 w-10 text-[var(--success-text)]" />
          <p className="text-base font-semibold text-[var(--text)]">
            {`Cuenta de ${detail.usuario.nombreCompleto} activada`}
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Ya puede entrar desde la aplicación. El enlace queda consumido.
          </p>
          <Link className="text-sm underline underline-offset-4" href="/admin/membership">
            Ver membresías
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Activar por pago en efectivo"
        description="El cliente declaró haber pagado fuera de la aplicación. Elige el plan y confirma."
      />

      <Card>
        <CardHeader title="Quién lo pidió" />
        <CardContent className="flex flex-col gap-2 text-sm">
          <p className="text-base font-semibold text-[var(--text)]">
            {detail.usuario.nombreCompleto}
          </p>
          <p className="flex items-center gap-2 text-[var(--text-muted)]">
            <Mail className="h-4 w-4" />
            {detail.usuario.email}
          </p>
          <p className="flex items-center gap-2 text-[var(--text-muted)]">
            <Clock className="h-4 w-4" />
            {`El enlace caduca el ${new Date(detail.expiraEn).toLocaleString('es')}`}
          </p>
          {detail.nota ? (
            <p className="rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-3 text-[var(--text-muted)]">
              {detail.nota}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <Field htmlFor="plan" label="Plan a activar">
            <Select
              id="plan"
              onChange={(event) => setPlanId(event.target.value)}
              value={planId}
            >
              <option value="">Elige un plan…</option>
              {(plans.data ?? []).map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {`${plan.nombre} · ${plan.duracionDias} días`}
                </option>
              ))}
            </Select>
          </Field>

          {confirm.isError ? (
            <p
              className="rounded-[4px] border border-[var(--danger-border)] bg-[var(--danger-surface)] p-3 text-sm text-[var(--danger-text)]"
              role="alert"
            >
              {confirm.error instanceof ApiError
                ? confirm.error.message
                : 'No se pudo activar la cuenta.'}
            </p>
          ) : null}

          <Button
            disabled={!planId || confirm.isPending}
            loading={confirm.isPending}
            onClick={() => confirm.mutate()}
          >
            Activar cuenta
          </Button>

          <p className="flex items-start gap-2 text-xs text-[var(--text-muted)]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            Queda registrado qué cuenta se activó, con qué plan y qué miembro del personal lo hizo.
          </p>
          <Badge tone="info">El enlace sólo puede usarse una vez</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
