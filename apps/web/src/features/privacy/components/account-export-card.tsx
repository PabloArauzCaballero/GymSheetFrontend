'use client';

import {
  accountExportCopy,
  accountExportPollInterval,
  exportRetryAfterSeconds,
  isAccountExportDownloadable,
  waitLabel,
} from '@gymsheet/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { ApiError } from '@/shared/api/api-error';
import { ACCOUNT_EXPORT_RATE_LIMITED } from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';
import { Button, buttonClasses } from '@/shared/components/ui/button';
import { exportDownloadHref, privacyService } from '../services/privacy-service';

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'long' });

/** «Descargar mis datos»: ask for the archive, follow it while it builds, download it when ready. */
export function AccountExportCard({ description = accountExportCopy.description }: Readonly<{ description?: string }>) {
  const queryClient = useQueryClient();
  const [limited, setLimited] = useState<string | null>(null);

  // The server's latest request: a reload or another device resumes it
  // (pending → keep polling, ready → download) instead of hitting the 24 h limit.
  const latest = useQuery({
    queryKey: queryKeys.accountExportLatest,
    queryFn: privacyService.latestExport,
    refetchInterval: (query) => accountExportPollInterval(query.state.data ?? undefined),
    retry: false,
  });

  const request = useMutation({
    mutationFn: () => privacyService.requestExport(),
    onSuccess: (created) => {
      setLimited(null);
      // The 202 already is the latest status: polling starts from it.
      queryClient.setQueryData(queryKeys.accountExportLatest, created);
    },
    onError: (failure: Error) => {
      if (failure instanceof ApiError && failure.code === ACCOUNT_EXPORT_RATE_LIMITED) {
        const seconds = exportRetryAfterSeconds(failure.details);
        setLimited(seconds ? accountExportCopy.rateLimited(waitLabel(seconds)) : failure.message);
      } else setLimited(failure.message);
    },
  });

  const current = latest.data ?? undefined;
  const downloadable = current && isAccountExportDownloadable(current);

  return (
    <div className="grid gap-3">
      <p className="t-subhead text-[var(--text-muted)]">{description}</p>
      {current?.status === 'PENDING' ? (
        <p className="t-subhead inline-flex items-center gap-2" role="status">
          <LoaderCircle aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
          {accountExportCopy.pending}
        </p>
      ) : null}
      {downloadable ? (
        <div className="grid gap-2" role="status">
          <p className="t-subhead">{accountExportCopy.ready}</p>
          {current.expiresAt ? (
            <p className="t-footnote text-[var(--text-muted)]">{accountExportCopy.expires(dateLabel(current.expiresAt))}</p>
          ) : null}
          <a className={`${buttonClasses('primary', 'sm')} justify-self-start`} download href={exportDownloadHref(current.id)}>
            <Download aria-hidden className="size-4" />
            {accountExportCopy.download}
          </a>
        </div>
      ) : null}
      {current?.status === 'FAILED' ? (
        <p className="t-subhead text-[var(--danger-text)]" role="alert">
          {accountExportCopy.failed}
        </p>
      ) : null}
      {limited ? (
        <p className="t-subhead text-[var(--text-muted)]" role="alert">
          {limited}
        </p>
      ) : null}
      {!latest.isPending && current?.status !== 'PENDING' && !downloadable ? (
        <Button
          className="justify-self-start"
          loading={request.isPending}
          onClick={() => request.mutate()}
          size="sm"
          variant="secondary"
        >
          {accountExportCopy.request}
        </Button>
      ) : null}
    </div>
  );
}
