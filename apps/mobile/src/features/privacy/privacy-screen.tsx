import { Fragment } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { accountClosureCopy, accountNameCopy, consentsSectionCopy, emailChangeCopy, privacySettingsCopy } from '@gymsheet/domain';
import { ErrorState, RowsSkeleton } from '@/components/feedback';
import { Card, Divider, ScrollScreen, ScreenHeader, Section } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { SheetRow } from '@/features/chat/chat-sheets';
import { ConsentRow } from '@/features/consents/consent-row';
import { useConsents } from '@/features/consents/use-consents';
import { legalDocumentRoutes } from '@/features/legal/legal-logic';
import { colors, spacing } from '@/theme';
import { ExportCard } from './export-card';

/**
 * «Privacidad y datos», from Ajustes: the separate consents, the copy of
 * everything stored, and the account rights (name, email, closure).
 */
export function PrivacyScreen() {
  const router = useRouter();
  const { consents, toggle, pendingKind } = useConsents();

  return (
    <ScrollScreen onRefresh={() => void consents.refetch()} refreshing={consents.isRefetching}>
      <BackLink fallbackHref="/settings" />
      <ScreenHeader detail subtitle={privacySettingsCopy.description} title={privacySettingsCopy.title} />

      <Section icon="hand-left-outline" title={consentsSectionCopy.title}>
        {consents.isPending ? (
          <RowsSkeleton rows={4} thumb={24} />
        ) : consents.isError ? (
          <ErrorState error={consents.error} onRetry={() => void consents.refetch()} />
        ) : (
          <Card list>
            {consents.data.map((consent, index) => (
              <Fragment key={consent.kind}>
                {index > 0 ? <Divider /> : null}
                <ConsentRow
                  consent={consent}
                  disabled={pendingKind !== null}
                  onToggle={(next) => toggle(consent.kind, next)}
                  pending={pendingKind === consent.kind}
                />
              </Fragment>
            ))}
          </Card>
        )}
      </Section>

      <Section icon="download-outline" title="Tus datos">
        <ExportCard />
      </Section>

      <Section icon="person-outline" title="Tu cuenta">
        <View style={{ gap: spacing.sm }}>
          <SheetRow icon="create-outline" label={accountNameCopy.title} onPress={() => router.push('/cambiar-nombre')} testID="privacy-rename" />
          <SheetRow
            hint="Te enviaremos un código al correo nuevo."
            icon="mail-outline"
            label={emailChangeCopy.title}
            onPress={() => router.push('/cambiar-correo')}
            testID="privacy-email"
          />
          <SheetRow
            hint={accountClosureCopy.description}
            icon="trash-outline"
            label={accountClosureCopy.title}
            onPress={() => router.push('/cerrar-cuenta')}
            testID="privacy-close"
            tint={colors.danger}
          />
        </View>
      </Section>

      <Section icon="document-text-outline" title="Documentos">
        <View style={{ gap: spacing.sm }}>
          {Object.values(legalDocumentRoutes).map((route) => (
            <SheetRow icon="document-text-outline" key={route.path} label={route.label} onPress={() => router.push(route.href)} />
          ))}
        </View>
      </Section>
    </ScrollScreen>
  );
}
