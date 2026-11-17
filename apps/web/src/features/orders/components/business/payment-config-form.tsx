'use client';

import { paymentConfigErrors, paymentConfigFormOf, paymentConfigPayload, PAYMENT_CONFIG_STEPS, type PaymentConfigField, type PaymentConfigForm } from '@gymsheet/domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import type { PaymentConfig } from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { notify } from '@/shared/notifications';
import { businessOrdersService, orderErrorText } from '../../services/orders-client';

const TEXT_FIELDS: Readonly<Partial<Record<PaymentConfigField, { label: string; hint?: string; autoComplete?: string }>>> = {
  bankName: { label: 'Banco', autoComplete: 'off' },
  accountHolderName: { label: 'Titular de la cuenta', hint: 'Como figura en el banco. Debería ser tu negocio o su representante.' },
  accountNumber: { label: 'Número de cuenta', hint: 'Opcional.' },
  aliasOrPhone: { label: 'Alias o celular', hint: 'Opcional.' },
};

/**
 * The business's payment data in two steps of at most four fields (plan §4.1
 * rule): the account, then how it charges. The holder check never blocks;
 * the QR image is uploaded apart, once the data exists.
 */
export function PaymentConfigFormView({ config, onDone }: Readonly<{ config: PaymentConfig | null; onDone: () => void }>) {
  const client = useQueryClient();
  const [form, setForm] = useState<PaymentConfigForm>(() => paymentConfigFormOf(config));
  const [step, setStep] = useState<1 | 2>(1);
  const [tried, setTried] = useState(false);
  const errors = tried ? paymentConfigErrors(form, step) : {};
  const save = useMutation({
    mutationFn: () => businessOrdersService.savePaymentConfig(paymentConfigPayload(form)),
    onSuccess: (saved) => {
      client.setQueryData(queryKeys.business.paymentConfig, saved);
      notify.success('Datos de cobro guardados.');
      onDone();
    },
  });
  const set = <K extends PaymentConfigField>(key: K, value: PaymentConfigForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <form
      aria-labelledby="payment-step-title"
      className="grid gap-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (Object.keys(paymentConfigErrors(form, step)).length > 0) return;
        setTried(false);
        if (step === 1) setStep(2);
        else save.mutate();
      }}
    >
      <div className="grid gap-1">
        <p className="t-footnote text-[var(--text-muted)]">Paso {step} de 2</p>
        <h2 className="t-headline" id="payment-step-title">{step === 1 ? 'Tu cuenta' : 'Cómo cobras'}</h2>
      </div>
      {step === 1 ? (
        PAYMENT_CONFIG_STEPS[1].map((key) => {
          const meta = TEXT_FIELDS[key];
          if (!meta) return null;
          return (
            <Field error={errors[key]} hint={meta.hint} key={key} label={meta.label}>
              <Input autoComplete={meta.autoComplete ?? 'off'} name={key} spellCheck={key === 'bankName' || key === 'accountHolderName'} maxLength={key === 'accountHolderName' ? 180 : 100} onChange={(event) => set(key, event.target.value)} value={String(form[key])} />
            </Field>
          );
        })
      ) : (
        <>
          <Field error={errors.instructions} hint="Opcional. Por ejemplo: «Escribe tu nombre en la glosa»." label="Instrucciones para pagar">
            <Textarea maxLength={2000} name="instructions" onChange={(event) => set('instructions', event.target.value)} rows={3} value={form.instructions} />
          </Field>
          <Checkbox checked={form.acceptsCash} label="También acepto efectivo en mi negocio" onChange={(event) => set('acceptsCash', event.target.checked)} />
          <Checkbox checked={form.isActive} label="Recibir pedidos ahora" onChange={(event) => set('isActive', event.target.checked)} />
        </>
      )}
      {save.error ? <p className="t-subhead text-[var(--danger-text)]" role="alert">{orderErrorText(save.error)}</p> : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button onClick={() => (step === 2 ? setStep(1) : onDone())} type="button" variant="ghost">
          {step === 2 ? 'Atrás' : 'Cancelar'}
        </Button>
        <Button loading={save.isPending} type="submit" variant="primary">
          {step === 1 ? 'Continuar' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
}
