import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Linking, Switch, Text, View } from 'react-native';
import { chatService } from '@/api/services';
import { Card, Divider, Row, ScrollScreen, ScreenHeader, Section } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { Button } from '@/components/ui';
import { ReadReceiptChatsSheet, SheetRow } from '@/features/chat/chat-sheets';
import { confirm, notify } from '@/notifications';
import { useAuthStore } from '@/state/auth-store';
import { env } from '@/config/env';
import { colors, fontSizes, semibold, spacing } from '@/theme';

const ENVIRONMENT_LABEL: Record<string, string> = {
  development: 'Desarrollo',
  staging: 'Pruebas',
  production: 'Producción',
};

const Z_ANATOMY_URL = 'https://github.com/LluisV/Z-Anatomy';
const CC_BY_SA_URL = 'https://creativecommons.org/licenses/by-sa/4.0/';

export default function SettingsScreen() {
  const logout = useAuthStore((state) => state.logout);
  const principal = useAuthStore((state) => state.principal);
  const [signingOut, setSigningOut] = useState(false);
  const [chooseChatsOpen, setChooseChatsOpen] = useState(false);
  const queryClient = useQueryClient();

  // El visto de lectura en general: antes estaba en la ficha de cada contacto,
  // donde parecía que tocaba solo a esa persona.
  const readReceipts = useQuery({
    queryKey: ['chat', 'read-receipts', 'global'],
    queryFn: () => chatService.getReadReceiptSettings(),
  });
  const conversations = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: () => chatService.listConversations(),
    enabled: chooseChatsOpen,
  });
  const updateReadReceipts = useMutation({
    mutationFn: chatService.updateReadReceiptSettings,
    onSuccess: async () => {
      setChooseChatsOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['chat', 'read-receipts'] }),
        queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] }),
      ]);
      notify.success('Preferencia de lectura actualizada.');
    },
    onError: async (error: Error) => {
      await queryClient.invalidateQueries({ queryKey: ['chat', 'read-receipts'] });
      notify.error(error.message);
    },
  });
  const allEnabled = readReceipts.data?.defaultEnabled;

  // Signing out drops the session on this device, so it asks first — the same
  // rule the web app applies to irreversible actions.
  const onLogout = async () => {
    const result = await confirm({
      title: 'Cerrar sesión',
      message: 'Se cerrará la sesión en este dispositivo. Deberás iniciar sesión de nuevo.',
      confirmLabel: 'Cerrar sesión',
      cancelLabel: 'Volver',
    });
    if (!result.confirmed) return;
    setSigningOut(true);
    try {
      await logout();
      notify.success('Sesión cerrada.');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <ScrollScreen>
      {/* Ajustes se empuja sobre la barra de pestañas, así que la barra deja de
          ser una salida: sin esta fila la única forma de volver era el gesto de
          borde, invisible para quien no lo conoce, y la pantalla parecía
          colgada. Las otras tres pantallas apiladas ya lo llevaban. */}
      <BackLink />
      <ScreenHeader title="Ajustes" />

      <Section icon="person-outline" title="Cuenta">
        <Card list>
          <Row icon="mail-outline" label="Correo" value={principal?.email ?? '—'} />
          <Divider />
          <Row icon="key-outline" label="Sesión" value="Guardada en el llavero del dispositivo" />
        </Card>
      </Section>

      <Section icon="chatbubbles-outline" title="Chats">
        <View style={{ gap: spacing.sm }}>
          <SheetRow
            hint={allEnabled === false
              ? 'Nadie ve cuándo lees sus mensajes, y tú tampoco ves los suyos.'
              : 'Se aplica a todas tus conversaciones.'}
            icon="checkmark-done-outline"
            label="Confirmación de lectura"
            testID="settings-read-receipts"
            trailing={allEnabled === undefined ? (
              <ActivityIndicator color={colors.volt} />
            ) : (
              <Switch
                accessibilityLabel="Confirmación de lectura en todos los chats"
                disabled={updateReadReceipts.isPending}
                onValueChange={(enabled) => readReceipts.data && updateReadReceipts.mutate({
                  scope: 'ALL',
                  enabled,
                  expectedVersion: readReceipts.data.version,
                })}
                thumbColor={colors.text}
                trackColor={{ false: colors.surfaceLow, true: colors.volt }}
                value={allEnabled}
              />
            )}
          />
          <SheetRow
            disabled={allEnabled === undefined}
            hint="Activa o desactiva el visto en varios chats a la vez"
            icon="list-outline"
            label="Elegir chats…"
            onPress={() => setChooseChatsOpen(true)}
            testID="settings-read-receipts-choose"
          />
        </View>
      </Section>

      <Section icon="phone-portrait-outline" title="Aplicación">
        <Card list>
          <Row icon="pricetag-outline" label="Versión" value="1.0.0" />
          <Divider />
          <Row icon="server-outline" label="Entorno" value={ENVIRONMENT_LABEL[env.environment] ?? env.environment} />
        </Card>
      </Section>

      {/* Crédito obligatorio: las imágenes anatómicas de la figura son una
          adaptación de un modelo con licencia CC BY-SA 4.0, que exige citar la
          autoría, la licencia y que se han hecho cambios. */}
      <Section icon="body-outline" title="Créditos">
        <Card>
          <Text style={{ color: colors.text, fontSize: fontSizes.sm, lineHeight: 22 }}>
            Las imágenes anatómicas de la figura de músculos son una adaptación (renderizado,
            selección de capas y color) de los modelos del proyecto Z-Anatomy, reunidos en la
            aplicación de Lluís Vinent Juanico, bajo licencia CC BY-SA 4.0.
          </Text>
          <Text
            accessibilityRole="link"
            onPress={() => void Linking.openURL(Z_ANATOMY_URL)}
            style={{ color: colors.accentInk, fontSize: fontSizes.sm, fontWeight: semibold, paddingVertical: spacing.xs }}
          >
            Z-Anatomy en GitHub
          </Text>
          <Text
            accessibilityRole="link"
            onPress={() => void Linking.openURL(CC_BY_SA_URL)}
            style={{ color: colors.accentInk, fontSize: fontSizes.sm, fontWeight: semibold, paddingVertical: spacing.xs }}
          >
            Licencia CC BY-SA 4.0
          </Text>
        </Card>
      </Section>

      <Button
        label="Cerrar sesión"
        loading={signingOut}
        onPress={() => void onLogout()}
        variant="danger"
      />

      <ReadReceiptChatsSheet
        chats={(conversations.data ?? [])
          .filter((item) => item.systemKind === null && item.canWrite)
          .map((item) => ({ conversationId: item.conversationId, name: item.nickname ?? item.otherUserName }))}
        disabled={!readReceipts.data}
        onApply={(conversationIds, enabled) => readReceipts.data && updateReadReceipts.mutate({
          scope: 'SELECTED',
          conversationIds,
          enabled,
          expectedVersion: readReceipts.data.version,
        })}
        onClose={() => setChooseChatsOpen(false)}
        pending={updateReadReceipts.isPending}
        visible={chooseChatsOpen}
      />
    </ScrollScreen>
  );
}
