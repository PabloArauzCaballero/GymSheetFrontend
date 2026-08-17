'use client';

import { CheckCircle2, RotateCcw, UserPlus } from 'lucide-react';
import type { MembershipPlan } from '@/shared/api/contracts';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';

export type EnrolledPerson = {
  readonly usuarioId: string;
  readonly nombre: string;
  readonly numeroCliente: string;
};

/** Confirmación del alta, con el identificador que necesitará el paso siguiente. */
export function EnrolledPersonSummary({
  person,
  onReset,
}: Readonly<{ person: EnrolledPerson; onReset: () => void }>) {
  return (
    <div className="grid gap-4">
      <div className="flex items-start gap-3 rounded-[4px] border border-[var(--success-border)] bg-[var(--success-bg)] p-4">
        <CheckCircle2 aria-hidden className="mt-0.5 size-5 text-[var(--success-text)]" />
        <div className="text-sm">
          <p className="font-semibold text-[var(--success-text)]">{person.nombre}</p>
          <p className="mt-1 break-all text-[var(--text-muted)]">
            Cliente {person.numeroCliente} · {person.usuarioId}
          </p>
        </div>
      </div>
      <Button onClick={onReset} variant="ghost">
        <RotateCcw className="size-4" />
        Registrar otra persona
      </Button>
    </div>
  );
}

/**
 * Datos mínimos para dar de alta a un cliente. La membresía es opcional porque
 * recepción suele registrar primero y cobrar después.
 */
export function PersonDetailsForm({
  plans,
  loading,
  onSubmit,
}: Readonly<{
  plans: readonly MembershipPlan[];
  loading: boolean;
  onSubmit: (form: FormData) => void;
}>) {
  return (
    <form action={onSubmit} className="grid gap-5">
      <Field label="Nombre completo">
        <Input minLength={3} name="nombreCompleto" required />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Correo">
          <Input name="email" required type="email" />
        </Field>
        <Field hint="Mínimo 10 caracteres." label="Contraseña inicial">
          <Input minLength={10} name="password" required type="password" />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Número de cliente">
          <Input name="numeroCliente" required />
        </Field>
        <Field hint="4 a 12 dígitos." label="PIN de acceso">
          <Input inputMode="numeric" name="pinAcceso" pattern="\d{4,12}" required />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Teléfono">
          <Input name="telefono" type="tel" />
        </Field>
        <Field hint="Opcional: activa la membresía al registrar." label="Plan inicial">
          <Select name="planId">
            <option value="">Sin membresía por ahora</option>
            {plans
              .filter((plan) => plan.estado === 'ACTIVE' && plan.disponibleNuevo)
              .map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.nombre}
                </option>
              ))}
          </Select>
        </Field>
      </div>
      <Field label="Notas">
        <Textarea name="notas" rows={2} />
      </Field>
      <Button loading={loading} type="submit" variant="primary">
        <UserPlus className="size-4" />
        Registrar persona
      </Button>
    </form>
  );
}
