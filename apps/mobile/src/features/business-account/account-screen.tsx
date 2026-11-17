import { businessAccountCopy, businessClosureCopy, businessDestination, businessLegalDocuments, kycErasureCopy } from '@gymsheet/domain';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { ScrollScreen, ScreenHeader, Section } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { Text } from '@/components/text';
import { SheetRow } from '@/features/chat/chat-sheets';
import { legalDocumentRoutes } from '@/features/legal/legal-logic';
import { ExportCard } from '@/features/privacy/export-card';
import { colors, spacing } from '@/theme';

/**
 * «Cuenta» of the business shell (plan §4.2, franja 8f): the legal set it
 * accepted, the copy of its data (the person's export, with the business
 * tables and its KYC), and — last and in red — the KYC erasure and the
 * closure. The name is not edited here: `PATCH /me/account` is a 403 for a
 * business, its name changes through a new KYC version.
 */
export function BusinessAccountScreen() {
  const router = useRouter();
  return (
    <ScrollScreen>
      <BackLink fallbackHref="/(business)/(tabs)/perfil" />
      <ScreenHeader detail subtitle={businessAccountCopy.description} title={businessAccountCopy.title} />

      <Section icon="document-text-outline" title={businessAccountCopy.legalTitle}>
        <View style={{ gap: spacing.sm }}>
          {businessLegalDocuments.map((document) => (
            <SheetRow
              icon="document-text-outline"
              key={document}
              label={legalDocumentRoutes[document].label}
              onPress={() => router.push(legalDocumentRoutes[document].href)}
            />
          ))}
          <SheetRow
            hint={businessAccountCopy.nameNote}
            icon="shield-checkmark-outline"
            label={businessAccountCopy.nameAction}
            onPress={() => router.push(businessDestination.mobile.kyc as Href)}
            testID="business-account-kyc"
          />
        </View>
      </Section>

      <Section icon="download-outline" title={businessAccountCopy.exportTitle}>
        <ExportCard />
        <Text tone="muted" variant="footnote">{businessAccountCopy.exportDescription}</Text>
      </Section>

      <Section icon="trash-outline" title={businessAccountCopy.dangerTitle}>
        <View style={{ gap: spacing.sm }}>
          <SheetRow
            hint={kycErasureCopy.description}
            icon="id-card-outline"
            label={kycErasureCopy.title}
            onPress={() => router.push('/(business)/borrar-verificacion')}
            testID="business-kyc-erase"
            tint={colors.danger}
          />
          <SheetRow
            hint={businessClosureCopy.description}
            icon="close-circle-outline"
            label={businessClosureCopy.title}
            onPress={() => router.push('/(business)/cerrar-cuenta')}
            testID="business-close"
            tint={colors.danger}
          />
        </View>
      </Section>
    </ScrollScreen>
  );
}
