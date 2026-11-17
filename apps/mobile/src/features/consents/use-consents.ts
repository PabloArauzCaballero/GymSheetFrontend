import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { confirm, notify } from '@/notifications';
import { socialProfileKeys } from '@/features/social-profile/query-keys';
import type { ConsentKind } from '@gymsheet/schemas';
import { askForConsent } from './ask-consent';
import { consentPromptMessage, consentsSectionCopy, sortConsents } from './consent-logic';
import { consentQueryKey, consentService, storeConsent } from './consent-service';

/** What each revocation erased on the server: the screens that show it read again. */
const AFFECTED: Readonly<Record<ConsentKind, readonly (readonly unknown[])[]>> = {
  HEALTH: [['onboarding']],
  ORIENTATION: [socialProfileKeys.profile],
  PRECISE_LOCATION: [['social', 'discovery-settings'], ['social-map']],
  VERIFICATION_SELFIE: [],
};

/** «Privacidad y datos»: the consent list, granting and revoking behind a confirmation. */
export function useConsents() {
  const queryClient = useQueryClient();
  const consents = useQuery({ queryKey: consentQueryKey, queryFn: consentService.list, select: sortConsents });

  const grant = useMutation({
    mutationFn: (kind: ConsentKind) => askForConsent(queryClient, kind),
    onSuccess: (granted) => {
      if (granted) notify.success(consentsSectionCopy.grantedNotice);
    },
    onError: (error) => notify.error(error),
  });

  const revoke = useMutation({
    mutationFn: (kind: ConsentKind) => consentService.set(kind, false),
    onSuccess: async (saved) => {
      storeConsent(queryClient, saved);
      await Promise.all(AFFECTED[saved.kind].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      notify.success(consentsSectionCopy.revokedNotice);
    },
    onError: (error) => notify.error(error),
  });

  const askRevoke = async (kind: ConsentKind) => {
    const result = await confirm({
      title: consentsSectionCopy.revokeTitle(kind),
      message: consentPromptMessage(kind, false),
      confirmLabel: consentsSectionCopy.revokeConfirm,
      cancelLabel: 'Volver',
      severity: 'danger',
    });
    if (result.confirmed) revoke.mutate(kind);
  };

  const pendingKind = grant.isPending ? grant.variables : revoke.isPending ? revoke.variables : null;
  return {
    consents,
    toggle: (kind: ConsentKind, next: boolean) => (next ? grant.mutate(kind) : void askRevoke(kind)),
    pendingKind,
  };
}
