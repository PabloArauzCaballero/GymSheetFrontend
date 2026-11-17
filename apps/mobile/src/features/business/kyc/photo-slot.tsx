import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { kycCopy, type DocumentVerdict, type KycDocumentSlot } from '@gymsheet/domain';
import { Badge, Card } from '@/components/layout';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { colors, iconSizes, radii, spacing } from '@/theme';

/** The framing guide shown before the camera opens: an ID-1 card outline (85.6 × 54 mm). */
function FrameGuide() {
  return (
    <View
      accessibilityLabel={kycCopy.documents.frameGuide}
      accessible
      style={{
        aspectRatio: 1.586,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: colors.borderControl,
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        padding: spacing.md,
      }}
    >
      <Ionicons accessibilityElementsHidden color={colors.textMuted} importantForAccessibility="no-hide-descendants" name="card-outline" size={iconSizes.lg} />
      <Text style={{ textAlign: 'center' }} tone="secondary" variant="footnote">{kycCopy.documents.frameGuide}</Text>
    </View>
  );
}

/**
 * One photo of step 6: camera first (with the framing guide for the CI),
 * the gallery as a fallback, and the verdict the moment it uploads.
 */
export function PhotoSlot({
  slot,
  verdict,
  present,
  busy,
  error,
  disabled = false,
  onTake,
  onPick,
  onRemove,
  children,
}: {
  slot: KycDocumentSlot;
  verdict: DocumentVerdict | null;
  present: boolean;
  busy: boolean;
  error: string | null;
  disabled?: boolean;
  onTake: () => void;
  onPick: () => void;
  onRemove?: () => void;
  children?: ReactNode;
}) {
  const status = present ? (verdict ? verdict.label : kycCopy.documents.logoReady) : slot.required ? kycCopy.documents.missing : kycCopy.documents.optional;
  const tone = !present ? (slot.required ? 'warning' : 'info') : verdict && !verdict.readable ? 'danger' : 'success';
  const isCard = slot.key === 'CI_FRONT' || slot.key === 'CI_BACK' || slot.key === 'SEPREC';

  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: spacing.smd, alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text accessibilityRole="header" strong variant="body">{slot.title}</Text>
          <Text tone="secondary" variant="footnote">{slot.hint}</Text>
        </View>
        <Badge label={status} tone={tone} />
      </View>
      {verdict && !verdict.readable ? <Text accessibilityLiveRegion="polite" tone="danger" variant="subhead">{verdict.reason}</Text> : null}
      {isCard && !present ? <FrameGuide /> : null}
      {children}
      {error ? <Text accessibilityLiveRegion="assertive" tone="danger" variant="subhead">{error}</Text> : null}
      <View style={{ gap: spacing.sm }}>
        <Button
          accessibilityLabel={`${present ? kycCopy.documents.retake : kycCopy.documents.take}: ${slot.title}`}
          disabled={disabled}
          icon="camera-outline"
          label={present ? kycCopy.documents.retake : kycCopy.documents.take}
          loading={busy}
          onPress={onTake}
          size="sm"
          variant={present ? 'ghost' : 'secondary'}
        />
        <Button
          accessibilityLabel={`${kycCopy.documents.gallery}: ${slot.title}`}
          disabled={disabled || busy}
          icon="images-outline"
          label={kycCopy.documents.gallery}
          onPress={onPick}
          size="sm"
          variant="ghost"
        />
        {present && onRemove ? (
          <Button accessibilityLabel={`${kycCopy.documents.remove}: ${slot.title}`} disabled={busy} icon="trash-outline" label={kycCopy.documents.remove} onPress={onRemove} size="sm" variant="ghost" />
        ) : null}
      </View>
    </Card>
  );
}
