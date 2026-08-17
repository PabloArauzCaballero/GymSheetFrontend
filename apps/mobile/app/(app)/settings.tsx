import { useState } from 'react';
import { Card, Divider, Row, ScrollScreen, ScreenHeader, Section } from '@/components/layout';
import { Button } from '@/components/ui';
import { confirm, notify } from '@/notifications';
import { useAuthStore } from '@/state/auth-store';
import { env } from '@/config/env';

const ENVIRONMENT_LABEL: Record<string, string> = {
  development: 'Desarrollo',
  staging: 'Pruebas',
  production: 'Producción',
};

export default function SettingsScreen() {
  const logout = useAuthStore((state) => state.logout);
  const principal = useAuthStore((state) => state.principal);
  const [signingOut, setSigningOut] = useState(false);

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
      <ScreenHeader title="Ajustes" />

      <Section title="Cuenta">
        <Card>
          <Row label="Correo" value={principal?.email ?? '—'} />
          <Divider />
          <Row label="Sesión" value="Guardada en el llavero del dispositivo" />
        </Card>
      </Section>

      <Section title="Aplicación">
        <Card>
          <Row label="Versión" value="1.0.0" />
          <Divider />
          <Row label="Entorno" value={ENVIRONMENT_LABEL[env.environment] ?? env.environment} />
        </Card>
      </Section>

      <Button
        label="Cerrar sesión"
        loading={signingOut}
        onPress={() => void onLogout()}
        variant="danger"
      />
    </ScrollScreen>
  );
}
