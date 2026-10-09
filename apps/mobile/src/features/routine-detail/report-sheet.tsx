import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { ApiError } from '@gymsheet/api-client';
import { reportReasonLabels, reportReasons, type ReportReason } from '@gymsheet/hooks';
import type { ReportTargetKind } from '@gymsheet/types';
import { communityService } from '@/api/services';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button, Input } from '@/components/ui';
import { ChoiceChip } from '@/components/wizard/choice-chip';
import { notify } from '@/notifications';
import { colors, fontSizes, spacing } from '@/theme';

export type ReportTarget = { kind: ReportTargetKind; id: string; label: string };

/**
 * Hoja de denuncia (RF-12): motivos cerrados («Ejercicio peligroso»,
 * «Información engañosa», «Copia de otra rutina»…) y un detalle opcional. Al
 * enviar: «Gracias. Lo revisaremos».
 */
export function ReportSheet({ target, onClose }: { target: ReportTarget | null; onClose: () => void }) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');

  const send = useMutation({
    mutationFn: () => {
      if (!target || !reason) throw new Error('Elige un motivo.');
      return communityService.report({
        targetKind: target.kind,
        targetId: target.id,
        reason,
        ...(details.trim() ? { details: details.trim() } : {}),
      });
    },
    onSuccess: () => {
      notify.success('Gracias. Lo revisaremos.');
      close();
    },
    onError: (error: Error) => {
      if (error instanceof ApiError && error.kind === 'conflict') {
        notify.info('Ya lo denunciaste. Lo estamos revisando.');
        close();
        return;
      }
      notify.error(error);
    },
  });

  function close() {
    setReason(null);
    setDetails('');
    onClose();
  }

  return (
    <BottomSheet
      onClose={close}
      subtitle={target?.label}
      testID="report-sheet"
      title="Denunciar"
      visible={target !== null}
    >
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>¿Qué pasa con esto?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {reportReasons.map((option) => (
          <ChoiceChip
            key={option}
            label={reportReasonLabels[option]}
            onSelect={() => setReason(option)}
            selected={reason === option}
            testID={`reason-${option}`}
          />
        ))}
      </View>
      <Input
        label="Detalle (opcional)"
        maxLength={1000}
        multiline
        onChangeText={setDetails}
        placeholder="Cuéntanos qué viste"
        testID="report-details"
        value={details}
      />
      <Button
        disabled={!reason}
        label="Enviar denuncia"
        loading={send.isPending}
        onPress={() => send.mutate()}
      />
    </BottomSheet>
  );
}
