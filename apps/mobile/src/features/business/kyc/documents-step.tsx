import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { View } from 'react-native';
import {
  documentOf,
  documentVerdict,
  documentsComplete,
  kycCopy,
  kycDocumentSlots,
  kycFailure,
  type KycDocumentSlot,
  type KycSlotKey,
} from '@gymsheet/domain';
import { queryKeys, withDocument, withoutDocument } from '@gymsheet/hooks';
import type { BusinessMe, KycState } from '@gymsheet/schemas';
import { Text } from '@/components/text';
import { confirm } from '@/notifications';
import { spacing } from '@/theme';
import { kycService, photoForm, useKycCache } from './kyc-service';
import { PhotoSlot } from './photo-slot';
import { pickKycPhoto, takeKycPhoto, type PickResult } from './pick-photo';
import { SelfieGate, useSelfieReady } from './selfie-gate';
import { StepNav } from './step-nav';

/**
 * Step 6, «Documentos»: CI both sides, the selfie with its gesture (consent
 * first), the company logo (public) and the optional SEPREC. Camera first,
 * gallery as fallback; every upload answers at once whether it can be read.
 */
export function DocumentsStep({ state, me, onNext, onBack }: { state: KycState; me: BusinessMe | undefined; onNext: () => void; onBack: () => void }) {
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
  const setError = (key: KycSlotKey, message: string | null) => setErrors((current) => ({ ...current, [key]: message ?? undefined }));

  async function upload(slot: KycDocumentSlot, pick: () => Promise<PickResult>) {
    setError(slot.key, null);
    setBusy(slot.key);
    try {
      const picked = await pick();
      if ('cancelled' in picked) return;
      if ('error' in picked) return setError(slot.key, picked.error);
      const form = await photoForm(picked.file);
      if (slot.key === 'LOGO') {
        const logo = await kycService.uploadLogo(form);
        client.setQueryData<BusinessMe>(queryKeys.business.me, (current) => (current ? { ...current, entity: { ...current.entity, logoUrl: logo.url } } : current));
        return;
      }
      const document = await kycService.uploadDocument(slot.key, form);
      cache((current) => withDocument(current, document));
      void Haptics.notificationAsync(document.readable ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    } catch (error) {
      setError(slot.key, kycFailure(error).message);
      if (slot.key === 'SELFIE') void client.invalidateQueries({ queryKey: queryKeys.business.kyc });
    } finally {
      setBusy(null);
    }
  }

  async function remove(slot: KycDocumentSlot, documentId: string) {
    const answer = await confirm({ title: kycCopy.documents.removeTitle(slot.title), message: kycCopy.documents.removeMessage, confirmLabel: kycCopy.documents.remove, severity: 'danger' });
    if (!answer.confirmed) return;
    setBusy(slot.key);
    try {
      await kycService.deleteDocument(documentId);
      cache((current) => withoutDocument(current, documentId));
    } catch (error) {
      setError(slot.key, kycFailure(error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={{ gap: spacing.md }}>
      {kycDocumentSlots(legalKind).map((slot) => {
        const document = slot.key === 'LOGO' ? undefined : documentOf(documents, slot.key);
        return (
          <PhotoSlot
            busy={busy === slot.key}
            disabled={(busy !== null && busy !== slot.key) || (slot.key === 'SELFIE' && !selfieReady)}
            error={errors[slot.key] ?? null}
            key={slot.key}
            onPick={() => void upload(slot, () => pickKycPhoto(slot.key))}
            onTake={() => void upload(slot, () => takeKycPhoto(slot.key, slot.camera))}
            {...(document ? { onRemove: () => void remove(slot, document.id) } : {})}
            present={slot.key === 'LOGO' ? Boolean(logoUrl) : Boolean(document)}
            slot={slot}
            verdict={document ? documentVerdict(document) : null}
          >
            {slot.key === 'SELFIE' ? <SelfieGate challenge={challenge} consent={state.consent} /> : null}
          </PhotoSlot>
        );
      })}
      {unreadable > 0 ? <Text tone="warning" variant="subhead">{kycCopy.documents.unreadableNote}</Text> : null}
      <StepNav blocked={complete ? null : kycCopy.documents.needAll} onBack={onBack} onNext={onNext} />
    </View>
  );
}
