'use client';

import { businessSuspensionLabels, businessTypeLabel, kycReviewCopy as copy, kycStatusLabels } from '@gymsheet/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import {
  businessSuspensionReasonCodes,
  type BusinessAdminAccount,
  type BusinessSuspensionReasonCode,
  type EntityType,
} from '@/shared/api/schemas';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { InputWithIcon } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { confirm, notify } from '@/shared/notifications';
import { businessKycAdminService } from '@/features/business/services/business-kyc-client';

function AccountRow({ account }: Readonly<{ account: BusinessAdminAccount }>) {
  const client = useQueryClient();
  const [reason, setReason] = useState<BusinessSuspensionReasonCode | ''>('');
  const suspended = account.status === 'SUSPENDED';
  const act = useMutation({
    mutationFn: (code: BusinessSuspensionReasonCode) =>
      suspended ? businessKycAdminService.reinstate(account.accountId, code) : businessKycAdminService.suspend(account.accountId, code),
    onSuccess: async () => {
      notify.success(suspended ? copy.reinstated : copy.suspended);
      setReason('');
      await client.invalidateQueries({ queryKey: ['admin', 'business-accounts'] });
    },
    onError: (error: Error) => notify.error(error),
  });

  async function ask() {
    if (!reason) return;
    // Suspending hides the listing at once: it is confirmed first. Reinstating is not destructive.
    if (!suspended) {
      const answer = await confirm({
        title: copy.suspendTitle(account.name),
        message: copy.suspendMessage,
        confirmLabel: copy.suspend,
        severity: 'danger',
      });
      if (!answer.confirmed) return;
    }
    act.mutate(reason);
  }

  return (
    <li className="grid gap-3 border-b border-[var(--border-subtle)] p-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div className="grid min-w-0 gap-0.5">
        <p className="t-headline flex flex-wrap items-center gap-2">
          <span className="truncate">{account.name}</span>
          {account.isVerified ? <Badge tone="success">Verificado</Badge> : null}
          {suspended ? <Badge tone="danger">Suspendida</Badge> : null}
        </p>
        <p className="t-footnote truncate text-[var(--text-muted)]">
          {account.handle ? `@${account.handle} · ` : ''}
          {account.email}
        </p>
        <p className="t-footnote text-[var(--text-muted)]">
          {businessTypeLabel(account.entityType as EntityType)} · KYC {kycStatusLabels[account.kycStatus] ?? account.kycStatus}
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <Select aria-label={`${copy.suspensionReason}: ${account.name}`} onChange={(event) => setReason(event.target.value as BusinessSuspensionReasonCode | '')} value={reason}>
          <option value="">{copy.suspensionReason}</option>
          {businessSuspensionReasonCodes.map((code) => (
            <option key={code} value={code}>
              {businessSuspensionLabels[code]}
            </option>
          ))}
        </Select>
        <Button
          disabled={!reason}
          loading={act.isPending}
          onClick={() => void ask()}
          size="sm"
          type="button"
          variant={suspended ? 'secondary' : 'danger'}
        >
          {suspended ? copy.reinstate : copy.suspend}
        </Button>
      </div>
    </li>
  );
}

/** Business accounts with suspend / reinstate (audited; the business gets an in-app and an email notice). */
export function BusinessAccountsPanel() {
  const [search, setSearch] = useState('');
  const term = useDeferredValue(search.trim());
  const filter = term.length >= 2 ? term : '';
  const accounts = useQuery({
    queryKey: queryKeys.admin.businessKyc.accounts(filter),
    queryFn: () => businessKycAdminService.accounts(filter ? { search: filter } : {}),
  });

  return (
    <div className="grid gap-4">
      <Field htmlFor="business-accounts-search" label={copy.search}>
        <InputWithIcon
          icon={<Search className="size-4" />}
          id="business-accounts-search"
          onChange={(event) => setSearch(event.target.value)}
          type="search"
          value={search}
        />
      </Field>
      {accounts.isPending ? (
        <div className="h-64 animate-pulse rounded-[8px] bg-[var(--surface-low)] motion-reduce:animate-none" />
      ) : accounts.isError ? (
        <ErrorPanel error={accounts.error} message={accounts.error.message} onRetry={() => void accounts.refetch()} />
      ) : accounts.data.items.length === 0 ? (
        <EmptyState description={copy.noAccountsBody} flat title={copy.noAccounts} />
      ) : (
        <ul aria-label={copy.accountsTitle} className="m-0 list-none rounded-[var(--radius-lg)] border border-[var(--border-subtle)] p-0">
          {accounts.data.items.map((account) => (
            <AccountRow account={account} key={account.accountId} />
          ))}
        </ul>
      )}
    </div>
  );
}
