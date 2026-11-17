'use client';

import { documentVerdict, kycDocumentKindLabels, kycReviewCopy as copy, safeHref } from '@gymsheet/domain';
import { useEffect, useState } from 'react';
import type { KycAdminDocument } from '@/shared/api/schemas';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/cn';
import { fetchKycDocument } from '@/features/business/services/business-kyc-client';

type Loaded = { id: string; url: string } | { id: string; error: true };

/**
 * The private KYC photos, one at a time. Each view is a fresh authenticated
 * fetch through the BFF (`no-store`, audited by the backend) turned into an
 * object URL that is revoked when another photo opens or the case closes:
 * no photo ever has an address that works without the reviewer's session.
 */
export function KycDocumentViewer({
  submissionId,
  documents,
  logoUrl,
}: Readonly<{ submissionId: string; documents: readonly KycAdminDocument[]; logoUrl: string | null }>) {
  const live = documents.filter((document) => !document.deleted);
  const [openId, setOpenId] = useState<string | null>(live[0]?.id ?? null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const logo = safeHref(logoUrl);

  useEffect(() => {
    if (!openId) return undefined;
    const controller = new AbortController();
    let url: string | null = null;
    fetchKycDocument(submissionId, openId, controller.signal)
      .then((blob) => {
        url = URL.createObjectURL(blob);
        setLoaded({ id: openId, url });
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoaded({ id: openId, error: true });
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [submissionId, openId]);

  const current = loaded && loaded.id === openId ? loaded : null;
  const open = documents.find((document) => document.id === openId);

  return (
    <section className="grid gap-3">
      <h3 className="t-headline">{copy.documents}</h3>
      <div className="flex flex-wrap gap-2" role="group" aria-label={copy.documents}>
        {documents.map((document) => {
          const verdict = documentVerdict(document);
          return (
            <button
              aria-pressed={document.id === openId}
              className={cn(
                'inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] border px-3 text-[15px] transition-colors duration-[var(--dur-2)]',
                document.id === openId ? 'border-[var(--volt)] bg-[var(--surface-high)]' : 'border-[var(--border-subtle)] hover:bg-[var(--surface-low)]',
                document.deleted && 'opacity-60',
              )}
              disabled={document.deleted}
              key={document.id}
              onClick={() => setOpenId(document.id)}
              type="button"
            >
              {kycDocumentKindLabels[document.kind] ?? document.kind}
              <Badge tone={document.deleted ? 'neutral' : verdict.readable ? 'success' : 'warning'}>
                {document.deleted ? copy.documentDeleted : verdict.readable ? 'Legible' : 'Ilegible'}
              </Badge>
            </button>
          );
        })}
      </div>
      {open ? (
        <figure className="m-0 grid gap-2">
          <div className="grid min-h-64 place-items-center overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-low)]">
            {current && 'url' in current ? (
              // eslint-disable-next-line @next/next/no-img-element -- object URL of an authenticated, no-store fetch; never a remote address.
              <img alt={kycDocumentKindLabels[open.kind] ?? open.kind} className="max-h-[60vh] w-full object-contain" src={current.url} />
            ) : current ? (
              <p className="t-subhead text-[var(--danger-text)]" role="alert">
                {copy.documentFailed}
              </p>
            ) : (
              <div aria-busy className="h-64 w-full animate-pulse bg-[var(--surface)] motion-reduce:animate-none" />
            )}
          </div>
          <figcaption className="t-footnote text-[var(--text-muted)]">
            {open.width && open.height ? `${open.width} × ${open.height} px` : null}
            {open.selfieChallengeCode ? ` · Gesto pedido: ${open.selfieChallengeCode}` : null}
            {!open.readable ? ` · ${documentVerdict(open).reason}` : null}
          </figcaption>
        </figure>
      ) : null}
      {logo ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- the listing's public logo. */}
          <img alt="Logo del negocio" className="size-16 rounded-[var(--radius-md)] border border-[var(--border-subtle)] object-cover" src={logo} />
          <span className="t-footnote text-[var(--text-muted)]">Logo público del negocio</span>
        </div>
      ) : null}
    </section>
  );
}
