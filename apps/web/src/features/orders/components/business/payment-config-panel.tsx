'use client';

import { holderMatchText, paymentReadiness } from '@gymsheet/domain';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, CircleDashed } from 'lucide-react';
import { useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonDetail } from '@/shared/components/feedback/skeleton';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Button } from '@/shared/components/ui/button';
import { businessOrdersService } from '../../services/orders-client';
import { PaymentConfigFormView } from './payment-config-form';
import { PaymentQrUpload } from './payment-qr-upload';

const card = 'grid gap-5 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-5 sm:p-6';

/**
 * `/negocio/cobro` (plan §4.2 «Perfil → cobro QR»): where the business stands
 * to be paid, its bank data in two short steps and its private QR. REPP never
 * touches the money: the person pays the business, the business confirms.
 */
export function PaymentConfigPanel() {
  const config = useQuery({ queryKey: queryKeys.business.paymentConfig, queryFn: () => businessOrdersService.paymentConfig() });
  const [editing, setEditing] = useState(false);
  if (config.isPending) return <SkeletonDetail />;
  if (config.isError) return <ErrorPanel error={config.error} message={config.error.message} onRetry={() => void config.refetch()} />;
  const data = config.data;
  const readiness = paymentReadiness(data);
  const holder = holderMatchText(data?.holderMatch ?? null);
  const Icon = readiness.ready ? CheckCircle2 : CircleDashed;

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <PageHeader description="Te pagan directo a tu cuenta con tu QR, o en efectivo. Tú confirmas cada pago." title="Cobro" />
      <p className={`t-subhead flex items-center gap-2 font-semibold ${readiness.ready ? 'text-[var(--success-text)]' : 'text-[var(--text-muted)]'}`} role="status">
        <Icon aria-hidden className="size-5 shrink-0" />
        {readiness.text}
      </p>
      <div className={card}>
        {editing || !data ? (
          <PaymentConfigFormView config={data} onDone={() => setEditing(false)} />
        ) : (
          <div className="grid gap-4">
            <dl className="m-0 grid gap-3 sm:grid-cols-2">
              <div><dt className="t-footnote text-[var(--text-muted)]">Banco</dt><dd className="m-0 font-semibold">{data.bankName}</dd></div>
              <div><dt className="t-footnote text-[var(--text-muted)]">Titular</dt><dd className="m-0 font-semibold">{data.accountHolderName}</dd></div>
              {data.accountNumber ? <div><dt className="t-footnote text-[var(--text-muted)]">Cuenta</dt><dd className="m-0 font-semibold" translate="no">{data.accountNumber}</dd></div> : null}
              <div><dt className="t-footnote text-[var(--text-muted)]">Efectivo</dt><dd className="m-0 font-semibold">{data.acceptsCash ? 'Sí, en tu negocio' : 'No'}</dd></div>
            </dl>
            {holder ? <p className="t-subhead rounded-[var(--radius-lg)] bg-[var(--warning-bg)] p-3 text-[var(--warning-text)]">{holder}</p> : null}
            <Button className="justify-self-start" onClick={() => setEditing(true)} variant="ghost">Editar datos</Button>
          </div>
        )}
      </div>
      {data ? (
        <div className={card}>
          <PaymentQrUpload config={data} />
        </div>
      ) : null}
    </div>
  );
}
