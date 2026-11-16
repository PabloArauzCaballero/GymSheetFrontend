import { ScreenHeader, ScrollScreen } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { DiscoveryPreferencesEditor, SocialDiscoverySettingsEditor } from '@/components/social-status-editor';

/**
 * Conocer gente, desde el perfil: quién te ve (perfil social, otros gimnasios,
 * mapa) y a quién buscas. Mismos controles que la web enseña en su perfil;
 * aquí viven en su pantalla para no alargar el perfil del teléfono.
 */
export default function ConocerAjustesScreen() {
  return (
    <ScrollScreen>
      <BackLink fallbackHref="/profile" label="Perfil" neutral />
      <ScreenHeader subtitle="Quién te ve y a quién buscas." title="Conocer gente" />
      <SocialDiscoverySettingsEditor />
      <DiscoveryPreferencesEditor />
    </ScrollScreen>
  );
}
