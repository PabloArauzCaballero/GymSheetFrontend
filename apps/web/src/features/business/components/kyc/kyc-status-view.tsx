'use client';

import { kycOutcomeFromState } from '@gymsheet/domain';
import type { KycState } from '@/shared/api/schemas';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { useKycState } from '../../hooks/use-kyc';
import { KycResultView } from './kyc-result-view';

/** `/negocio/verificacion`: the KYC status from `GET /business/me/kyc`, kept fresh while the page is open. */
export function KycStatusView({ initial, handle }: Readonly<{ initial: KycState; handle: string | null }>) {
  const kyc = useKycState(initial);
  if (kyc.isError) return <ErrorPanel error={kyc.error} message={kyc.error.message} onRetry={() => void kyc.refetch()} />;
  return (
    <section aria-label="Verificación del negocio" className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-6 shadow-[var(--shadow-md)] sm:p-8">
      <KycResultView heading outcome={kycOutcomeFromState(kyc.data ?? initial, handle)} />
    </section>
  );
}
