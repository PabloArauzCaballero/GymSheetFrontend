import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { accountClosureCopy, businessClosureCopy, closureBlockerFromError, closureBlockerNotices } from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import {
  acceptedResponseSchema,
  closeAccountResultSchema,
  closurePreviewSchema,
  type CloseAccountInput,
} from '@gymsheet/schemas';
import { apiClient } from '@/api/client';
import { clearCatalogCache } from '@/lib/query-cache';
import { confirm } from '@/notifications';
import { useAuthStore } from '@/state/auth-store';
import { closureFailure, closureProof, proofMethods, type FormFailure, type ProofMethod } from './account-logic';
import { deleteCachedExport } from './export-file';

const closureService = {
  preview: () => apiClient.request('/me/account/closure-preview', closurePreviewSchema, { method: 'GET' }),
  requestPin: () => apiClient.request('/me/account/closure-pin', acceptedResponseSchema, { method: 'POST' }),
  close: (proof: CloseAccountInput) => apiClient.request('/me/account', closeAccountResultSchema, { method: 'DELETE', body: proof }),
};

/**
 * «Cerrar mi cuenta»: the preview of what is deleted, anonymized and kept;
 * the proof (password, or an emailed code for Google/Apple accounts); a last
 * confirmation; then this phone forgets the account and says goodbye.
 * `business` (ADR-0028): its own confirmation, and the blockers (receipts to
 * decide) that hold the closure back.
 */
export function useAccountClosure(business = false) {
  const queryClient = useQueryClient();
  const endClosedAccount = useAuthStore((state) => state.endClosedAccount);
  const preview = useQuery({ queryKey: queryKeys.accountClosurePreview, queryFn: closureService.preview, staleTime: 0 });
  const methods = preview.data ? proofMethods(preview.data) : (['password'] as ProofMethod[]);
  const [chosen, setChosen] = useState<ProofMethod | null>(null);
  const method = chosen ?? methods[0] ?? 'password';
  const [value, setValue] = useState('');
  const [failure, setFailure] = useState<FormFailure | null>(null);
  const [pinSent, setPinSent] = useState(false);

  const requestPin = useMutation({
    mutationFn: closureService.requestPin,
    onSuccess: () => {
      setPinSent(true);
      setFailure(null);
    },
    onError: (error) => setFailure(closureFailure(error)),
  });

  const close = useMutation({
    mutationFn: closureService.close,
    onSuccess: async () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      await endClosedAccount([
        () => queryClient.clear(),
        clearCatalogCache,
        deleteCachedExport,
      ]);
    },
    onError: (error) => {
      setFailure(closureFailure(error));
      // A receipt arrived after the preview: read it again so the blocker shows with its way out.
      if (closureBlockerFromError(error)) void preview.refetch();
    },
  });
  const blockers = preview.data ? closureBlockerNotices(preview.data) : [];
  const copy = business ? businessClosureCopy : accountClosureCopy;

  const submit = async () => {
    const proof = closureProof(method, value);
    if (!proof) {
      setFailure({ field: method, message: method === 'pin' ? 'Escribe los seis dígitos del código.' : 'Escribe tu contraseña.' });
      return;
    }
    const answer = await confirm({
      title: copy.confirmTitle,
      message: copy.confirmMessage,
      confirmLabel: copy.confirmLabel,
      cancelLabel: 'Volver',
      severity: 'danger',
    });
    if (!answer.confirmed) return;
    setFailure(null);
    close.mutate(proof);
  };

  return {
    preview,
    blockers,
    methods,
    method,
    choose: (next: ProofMethod) => {
      setChosen(next);
      setValue('');
      setFailure(null);
    },
    value,
    setValue: (text: string) => {
      setValue(text);
      if (failure?.field) setFailure(null);
    },
    failure,
    pinSent,
    sendPin: () => requestPin.mutate(),
    sendingPin: requestPin.isPending,
    submit: () => void submit(),
    closing: close.isPending,
  };
}
