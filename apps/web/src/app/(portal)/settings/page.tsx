import type { Metadata } from 'next';
import { DevicesSection } from '@/features/account-security/components/devices-section';
import { SettingsPage } from '@/features/settings/components/settings-page';
import { requireSession } from '@/shared/server/session';
import packageJson from '../../../../package.json';

export const metadata: Metadata = { title: 'Ajustes' };

export default async function SettingsRoute() {
  const session = await requireSession();
  return (
    <SettingsPage
      email={session.email}
      emailVerified={session.emailVerified}
      name={session.nombreCompleto}
      role={session.role}
      version={packageJson.version}
    >
      <DevicesSection />
    </SettingsPage>
  );
}
