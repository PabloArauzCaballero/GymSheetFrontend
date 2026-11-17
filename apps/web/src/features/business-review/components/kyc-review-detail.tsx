'use client';

import {
  businessTypeLabel,
  ciExtensionLabels,
  kycCheckLabel,
  kycCheckOutcomeLabels,
  kycCheckTone,
  kycPurposeLabels,
  kycReviewCopy as copy,
  kycReviewRefusal,
  kycStatusLabels,
} from '@gymsheet/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, type ReactNode } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import type { CiExtension, EntityType } from '@/shared/api/schemas';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { notify } from '@/shared/notifications';
import { formatDateTime } from '@/shared/lib/date';
import { businessKycAdminService } from '@/features/business/services/business-kyc-client';
import { KycDecisionForm } from './kyc-decision-form';
import { KycDocumentViewer } from './kyc-document-viewer';

function Facts({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section className="grid gap-2">
      <h3 className="t-headline">{title}</h3>
      <dl className="m-0 grid gap-1.5 text-[15px]">{children}</dl>
    </section>
  );
}

function Fact({ label, value }: Readonly<{ label: string; value: string | null | undefined }>) {
  return (
    <div className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-3">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="m-0 break-words tabular-nums">{value || '—'}</dd>
    </div>
  );
}

/**
 * One KYC case: who, the identity data in clear (the backend audits this
 * read), the automatic checks, every document in the viewer, the claim and
 * the decision. A refusal (taken by someone else, superseded, own business)
 * sends the reviewer back to a fresh queue.
 */
export function KycReviewDetail({ submissionId, viewerId, onDone }: Readonly<{ submissionId: string; viewerId: string; onDone: () => void }>) {
  const client = useQueryClient();
  const heading = useRef<HTMLHeadingElement>(null);
  const detail = useQuery({
    queryKey: queryKeys.admin.businessKyc.detail(submissionId),
    queryFn: () => businessKycAdminService.detail(submissionId),
    // Identity in clear: never kept around once the case is closed.
    gcTime: 0,
  });
  useEffect(() => heading.current?.focus(), [detail.isSuccess]);

  const settle = async (error?: unknown) => {
    const refusal = kycReviewRefusal((error as { code?: string } | undefined)?.code);
    if (error && !refusal) return notify.error(error as Error);
    if (refusal) notify.info(refusal);
    await client.invalidateQueries({ queryKey: queryKeys.admin.businessKyc.all });
    if (refusal) onDone();
  };
  const claim = useMutation({
    mutationFn: async (take: boolean): Promise<void> => {
      if (take) await businessKycAdminService.claim(submissionId);
      else await businessKycAdminService.release(submissionId);
    },
    onSuccess: () => settle(),
    onError: (error) => settle(error),
  });

  if (detail.isPending) return <div className="h-80 animate-pulse rounded-[8px] bg-[var(--surface-low)] motion-reduce:animate-none" />;
  if (detail.isError) return <ErrorPanel error={detail.error} message={detail.error.message} onRetry={() => void detail.refetch()} />;
  const data = detail.data;
  const { submission, identity } = data;
  const fields = submission.fields;
  const mine = data.claimedByUserId === viewerId;
  const taken = Boolean(data.claimedByUserId) && !mine;
  const ci = [identity.repCiNumber, fields.repCiComplement, fields.repCiExtension ? ciExtensionLabels[fields.repCiExtension as CiExtension] : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="grid gap-6">
      <header className="grid gap-1">
        <h2 className="title-text outline-none" ref={heading} tabIndex={-1}>
          {data.entity?.name ?? fields.tradeName ?? 'Negocio'}
        </h2>
        <p className="t-footnote text-[var(--text-muted)]">
          {data.handle ? `@${data.handle.handle} · ` : ''}
          {businessTypeLabel(data.account.entityType as EntityType)} · {kycPurposeLabels[submission.purpose] ?? submission.purpose} v{submission.version}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge tone="info">{kycStatusLabels[submission.status] ?? submission.status}</Badge>
          <span className="t-footnote text-[var(--text-muted)]">{mine ? copy.claimedByYou : taken ? copy.claimedByOther : null}</span>
          <Button
            disabled={taken}
            loading={claim.isPending}
            onClick={() => claim.mutate(!mine)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {mine ? copy.release : copy.claim}
          </Button>
        </div>
      </header>

      <Facts title={copy.identity}>
        <Fact label="Correo" value={data.account.email} />
        <Fact label="Razón social" value={fields.legalName} />
        <Fact label="NIT" value={identity.nit} />
        <Fact label="Representante" value={fields.repFullName} />
        <Fact label="Carnet" value={ci} />
        <Fact label="Celular" value={identity.phone ? `${identity.phone} · ${data.phoneVerified ? copy.phoneVerified : copy.phoneUnverified}` : null} />
        <Fact label="Dirección" value={fields.address} />
        {fields.specialty ? <Fact label="Especialidad" value={fields.specialty} /> : null}
        {fields.seprecNumber ? <Fact label="SEPREC" value={fields.seprecNumber} /> : null}
        <Fact label="Ciudad" value={data.entity?.city} />
      </Facts>

      <section className="grid gap-2">
        <h3 className="t-headline">{copy.checks}</h3>
        <ul className="m-0 grid list-none gap-1.5 p-0">
          {data.checks.map((check) => (
            <li className="flex items-center justify-between gap-3 text-[15px]" key={`${check.code}-${check.createdAt}`}>
              <span>{kycCheckLabel(check.code)}</span>
              <Badge tone={kycCheckTone(check.outcome)}>{kycCheckOutcomeLabels[check.outcome] ?? check.outcome}</Badge>
            </li>
          ))}
        </ul>
      </section>

      <KycDocumentViewer documents={data.documents} logoUrl={data.entity?.logoUrl ?? null} submissionId={submissionId} />

      {data.decisions.length > 0 ? (
        <section className="grid gap-1">
          <h3 className="t-headline">{copy.history}</h3>
          {data.decisions.map((decision) => (
            <p className="t-footnote text-[var(--text-muted)]" key={decision.id}>
              {formatDateTime(decision.createdAt)} · {decision.decision}
              {decision.reasonCodes.length > 0 ? ` · ${decision.reasonCodes.join(', ')}` : ''}
            </p>
          ))}
        </section>
      ) : null}

      <KycDecisionForm disabled={taken} onDecided={() => void settle().then(onDone)} onRefused={(error) => void settle(error)} status={submission.status} submissionId={submissionId} />
    </div>
  );
}
