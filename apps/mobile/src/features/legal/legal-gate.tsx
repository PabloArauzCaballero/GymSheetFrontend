import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'expo-router';
import { Modal, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthAlert, BrandEmblem } from '@/components/auth-shell';
import { Checkbox } from '@/components/checkbox';
import { ErrorState, RowsSkeleton } from '@/components/feedback';
import { NavRow } from '@/components/list';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/state/auth-store';
import { colors, iconSizes, screenGap, spacing } from '@/theme';
import {
  isReadingLegalDocument,
  isTermsVersionOutdated,
  legalDocumentRoutes,
  legalGateCopy,
  legalVersionLabel,
} from './legal-logic';
import { legalQueryKeys, legalService } from './legal-service';
import { useLegalGateStore } from './legal-store';

/**
 * Blocking screen while the API answers 428 LEGAL_ACCEPTANCE_REQUIRED, for any
 * role. Mounted once at the root; the API client raises the flag.
 *
 * A full-screen modal with no dismiss (Android back does nothing): every call
 * fails until the person accepts. It steps aside while one of the documents is
 * open, so «Términos» and «Privacidad» are the same screens as at signup.
 */
export function LegalGate() {
  const required = useLegalGateStore((state) => state.required);
  const authenticated = useAuthStore((state) => state.status === 'authenticated');
  const pathname = usePathname();
  const active = required && authenticated;
  return (
    <Modal animationType="fade" onRequestClose={() => undefined} visible={active && !isReadingLegalDocument(pathname)}>
      {active ? <LegalGateContent /> : null}
    </Modal>
  );
}

function LegalGateContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const clear = useLegalGateStore((state) => state.clear);
  const logout = useAuthStore((state) => state.logout);
  const [accepted, setAccepted] = useState(false);
  const [checkboxError, setCheckboxError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  // `gcTime: 0`: a list from an earlier block must never decide this one.
  const pending = useQuery({ queryKey: legalQueryKeys.pending, queryFn: legalService.pending, staleTime: 0, gcTime: 0 });
  const resume = useCallback(() => {
    clear();
    // Every screen behind the gate failed with 428: fetch them again.
    void queryClient.invalidateQueries();
  }, [clear, queryClient]);
  // Nothing pending (another account, or accepted on another device): let them through.
  const nothingPending = pending.isFetchedAfterMount && pending.data?.length === 0;
  useEffect(() => {
    if (nothingPending) resume();
  }, [nothingPending, resume]);

  const accept = useMutation({
    mutationFn: legalService.accept,
    onSuccess: (stillPending) => {
      if (stillPending.length === 0) resume();
      else queryClient.setQueryData(legalQueryKeys.pending, stillPending);
    },
    onError: (error) => {
      if (isTermsVersionOutdated(error)) {
        setAccepted(false);
        setFailure(legalGateCopy.changedAgain);
        void pending.refetch();
      } else {
        setFailure(legalGateCopy.failed);
      }
    },
  });

  const submit = () => {
    if (!accepted) {
      setCheckboxError(legalGateCopy.checkboxRequired);
      return;
    }
    setFailure(null);
    if (pending.data) accept.mutate(pending.data);
  };

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        gap: screenGap,
        paddingHorizontal: spacing.lg,
        paddingTop: insets.top + spacing.xl,
        paddingBottom: insets.bottom + spacing.xl,
      }}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <View accessibilityViewIsModal style={{ gap: spacing.md }}>
        <BrandEmblem />
        <Text accessibilityRole="header" variant="title">
          {legalGateCopy.title}
        </Text>
        <Text tone="secondary">{legalGateCopy.description}</Text>
      </View>

      {pending.isPending ? <RowsSkeleton /> : null}
      {pending.isError ? (
        <ErrorState error={pending.error} onRetry={() => void pending.refetch()} />
      ) : null}
      {pending.data && pending.data.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          <View>
            {pending.data.map((entry) => (
              <NavRow
                key={entry.document}
                leading={
                  <Ionicons color={colors.textMuted} name="document-text-outline" size={iconSizes.md} />
                }
                onPress={() => router.push(legalDocumentRoutes[entry.document].href)}
                subtitle={legalVersionLabel(entry.version)}
                title={legalDocumentRoutes[entry.document].label}
              />
            ))}
          </View>
          <View style={{ gap: spacing.xs }}>
            <Checkbox
              checked={accepted}
              label={legalGateCopy.checkbox}
              onChange={(next) => {
                setAccepted(next);
                setCheckboxError(null);
              }}
            />
            {checkboxError ? (
              <Text accessibilityLiveRegion="polite" accessibilityRole="alert" tone="danger" variant="footnote">
                {checkboxError}
              </Text>
            ) : null}
          </View>
          {failure ? <AuthAlert message={failure} /> : null}
          <Button label={legalGateCopy.submit} loading={accept.isPending} onPress={submit} />
        </View>
      ) : null}

      <Button
        label={legalGateCopy.logout}
        onPress={() => {
          clear();
          void logout();
        }}
        variant="ghost"
      />
    </ScrollView>
  );
}
