import { ApiError } from '@gymsheet/api-client';
import { businessReportCopy, businessReportReasonLabels, businessReportReasons, type BusinessReportReason, type BusinessReportTargetKind } from '@gymsheet/domain';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { Text } from '@/components/text';
import { Button, Input } from '@/components/ui';
import { ChoiceChip } from '@/components/wizard/choice-chip';
import { marketplaceService } from '@/features/business-listings/listings-service';
import { notify } from '@/notifications';
import { spacing } from '@/theme';

export type BusinessReportTarget = { kind: BusinessReportTargetKind; id: string; label: string };

/**
 * «⋯ Reportar» of a public listing or business profile (ADR-0022): the
 * marketplace reasons and an optional detail, the same sheet as the routine
 * report. Only a public target can be reported; the backend answers 404 otherwise.
 */
export function BusinessReportSheet({ target, onClose }: { target: BusinessReportTarget | null; onClose: () => void }) {
  const [reason, setReason] = useState<BusinessReportReason | null>(null);
  const [details, setDetails] = useState('');
  function close() {
    setReason(null);
    setDetails('');
    onClose();
  }
  const send = useMutation({
    mutationFn: () => {
      if (!target || !reason) throw new Error('Elige un motivo.');
      return marketplaceService.report({ targetKind: target.kind, targetId: target.id, reason, ...(details.trim() ? { details: details.trim() } : {}) });
    },
    onSuccess: (result) => {
      notify.success(result.contentHidden ? businessReportCopy.hidden : businessReportCopy.sent);
      close();
    },
    onError: (error: Error) => {
      if (error instanceof ApiError && error.kind === 'conflict') {
        notify.info('Ya lo reportaste. REPP lo está revisando.');
        close();
        return;
      }
      notify.error(error);
    },
  });
  return (
    <BottomSheet
      onClose={close}
      subtitle={target?.label}
      testID="business-report-sheet"
      title={target?.kind === 'BUSINESS_PROFILE' ? businessReportCopy.profileTitle : businessReportCopy.listingTitle}
      visible={target !== null}
    >
      <Text tone="secondary" variant="subhead">
        ¿Qué pasa con esto?
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {businessReportReasons.map((option) => (
          <ChoiceChip key={option} label={businessReportReasonLabels[option]} onSelect={() => setReason(option)} selected={reason === option} testID={`reason-${option}`} />
        ))}
      </View>
      <Input label="Detalle (opcional)" maxLength={1000} multiline onChangeText={setDetails} placeholder="Cuéntanos qué viste" value={details} />
      <Text tone="secondary" variant="footnote">
        {businessReportCopy.consequence}
      </Text>
      <Button disabled={!reason} label="Enviar reporte" loading={send.isPending} onPress={() => send.mutate()} />
    </BottomSheet>
  );
}
