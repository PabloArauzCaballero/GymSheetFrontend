'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  documentOf,
  documentVerdict,
  documentsComplete,
  kycCopy,
  kycDocumentSlots,
  kycFailure,
  kycImageProblem,
  safeHref,
  type KycDocumentSlot,
  type KycSlotKey,
} from '@gymsheet/domain';
import { queryKeys, withDocument, withoutDocument } from '@/shared/api/query-keys';
import type { BusinessMe, KycState } from '@/shared/api/schemas';
import { useKycCache } from '../../hooks/use-kyc';
import { businessKycService } from '../../services/business-kyc-client';
import { KycNav } from './kyc-nav';
import { KycPhotoSlot } from './kyc-photo-slot';
import { KycSelfieGate, useSelfieReady } from './kyc-selfie-gate';

/**
 * Step 6, «Documentos»: the representative's CI (both sides), the selfie with
 * its gesture (consent first), the company logo (public, `POST /business/me/media`)
 * and the optional SEPREC. Each upload answers at once whether it can be read.
 */
export function KycDocumentsStep({
  state,
  me,
  onNext,
  onBack,
}: Readonly<{ state: KycState; me: BusinessMe | undefined; onNext: () => void; onBack: () => void }>) {
  const client = useQueryClient();
  const cache = useKycCache();
  const [busy, setBusy] = useState<KycSlotKey | null>(null);
  const [errors, setErrors] = useState<Partial<Record<KycSlotKey, string>>>({});
  const legalKind = state.submission?.legalKind ?? me?.account.legalKind ?? 'COMPANY';
  const documents = state.submission?.documents ?? [];
  const challenge = state.submission?.selfieChallenge ?? null;
  const selfieReady = useSelfieReady(state.consent, challenge);
  const logoUrl = me?.entity.logoUrl ?? null;
  const complete = documentsComplete(legalKind, documents, Boolean(logoUrl));
  const unreadable = documents.filter((document) => !document.readable).length;

  const setError = (key: KycSlotKey, message: string | null) =>
    setErrors((current) => {
      const next = { ...current };
      if (message) next[key] = message;
      else delete next[key];
      return next;
    });

  async function upload(slot: KycDocumentSlot, file: File) {
    const problem = kycImageProblem(file);
    if (problem) return setError(slot.key, problem);
    setError(slot.key, null);
    setBusy(slot.key);
    const form = new FormData();
    form.append('file', file, file.name);
    try {
      if (slot.key === 'LOGO') {
        const logo = await businessKycService.uploadLogo(form);
        client.setQueryData<BusinessMe>(queryKeys.business.me, (current) => (current ? { ...current, entity: { ...current.entity, logoUrl: logo.url } } : current));
      } else {
        const document = await businessKycService.uploadDocument(slot.key, form);
        cache((current) => withDocument(current, document));
      }
    } catch (error: unknown) {
      setError(slot.key, kycFailure(error).message);
      // An expired or missing gesture: re-read the attempt so the gate asks for a new one.
      if (slot.key === 'SELFIE') void client.invalidateQueries({ queryKey: queryKeys.business.kyc });
    } finally {
      setBusy(null);
    }
  }

  async function remove(slot: KycDocumentSlot, documentId: string) {
    setBusy(slot.key);
    try {
      await businessKycService.deleteDocument(documentId);
      cache((current) => withoutDocument(current, documentId));
    } catch (error: unknown) {
      setError(slot.key, kycFailure(error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-5">
      <ul aria-label="Fotos de la verificación" className="m-0 grid list-none gap-3 p-0">
        {kycDocumentSlots(legalKind).map((slot) => {
          const document = slot.key === 'LOGO' ? undefined : documentOf(documents, slot.key);
          const present = slot.key === 'LOGO' ? Boolean(logoUrl) : Boolean(document);
          const logoSrc = slot.key === 'LOGO' ? safeHref(logoUrl) : undefined;
          return (
            <KycPhotoSlot
              busy={busy === slot.key}
              disabled={(busy !== null && busy !== slot.key) || (slot.key === 'SELFIE' && !selfieReady)}
              error={errors[slot.key] ?? null}
              key={slot.key}
              onPick={(file) => void upload(slot, file)}
              {...(document ? { onRemove: () => void remove(slot, document.id) } : {})}
              present={present}
              slot={slot}
              verdict={document ? documentVerdict(document) : null}
            >
              {slot.key === 'SELFIE' ? <KycSelfieGate challenge={challenge} consent={state.consent} /> : null}
              {logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element -- the listing's own public logo, served by the backend's media storage.
                <img alt="" className="size-16 rounded-[var(--radius-md)] border border-[var(--border-subtle)] object-cover" src={logoSrc} />
              ) : null}
            </KycPhotoSlot>
          );
        })}
      </ul>
      {unreadable > 0 ? <p className="t-subhead text-[var(--warning-text)]">{kycCopy.documents.unreadableNote}</p> : null}
      <KycNav blocked={complete ? null : kycCopy.documents.needAll} onBack={onBack} onNext={onNext} />
    </div>
  );
}
