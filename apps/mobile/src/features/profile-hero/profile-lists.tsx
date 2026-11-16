import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { weightRowSubtitle } from '@gymsheet/domain';
import type { Profile } from '@gymsheet/types';
import { membershipService, profileService, socialService } from '@/api/services';
import { ChatTile, ROW_GLYPH_WIDTH } from '@/components/chat-tile';
import { ErrorState } from '@/components/feedback';
import { Badge, Card, Divider, Section } from '@/components/layout';
import { NavRow } from '@/components/list';
import { GOAL_LABEL, MEMBERSHIP_LABEL, MEMBERSHIP_TONE, formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';
import { useTourStore } from '@/state/tour-store';
import { colors, iconSizes, spacing } from '@/theme';
import { useChatWaiting } from '@/features/chat/use-chat-waiting';
import { LogoutRow } from './logout-row';

/** Glifo de fila, callado: el protagonista de la pantalla es la cara, no la lista. */
function RowGlyph({ icon }: { icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: ROW_GLYPH_WIDTH, alignItems: 'center' }}>
      <Ionicons color={colors.textSecondary} name={icon} size={iconSizes.md} />
    </View>
  );
}

/** Lista agrupada de filas que navegan: el patrón de ajustes de iOS. */
function RowGroup({ children }: { children: ReactNode[] }) {
  const items = children.filter(Boolean);
  return (
    <Card list>
      {items.map((child, index) => (
        <View key={index}>
          {index > 0 ? <Divider /> : null}
          {child}
        </View>
      ))}
    </Card>
  );
}

export function ActivityList() {
  const router = useRouter();
  const waiting = useChatWaiting();
  return (
    <Section title="Tu actividad">
      <RowGroup>
        {[
          <NavRow key="entrenos" leading={<RowGlyph icon="barbell-outline" />} onPress={() => router.push('/workouts')} subtitle="Todas tus sesiones, con sus series" title="Mis entrenos" />,
          <NavRow key="ejercicios" leading={<RowGlyph icon="star-outline" />} onPress={() => router.push(routes.exerciseFavorites())} subtitle="Tus favoritos ☆ y el catálogo completo" testID="profile-exercises" title="Mis ejercicios y favoritos" />,
          <NavRow key="chat" leading={<ChatTile count={waiting.count} pulseKey={waiting.pulseKey} />} onPress={() => router.push('/chat')} subtitle={waiting.label ?? 'Habla con tus conexiones'} testID="profile-chat" title="Chat" />,
          <NavRow key="training-invitations" leading={<RowGlyph icon="people-outline" />} onPress={() => router.push('/training-invitations')} subtitle="Invitaciones recibidas y encuentros" title="Entrenar juntos" />,
        ]}
      </RowGroup>
    </Section>
  );
}

type DiscoverySettings = Awaited<ReturnType<typeof socialService.getDiscoverySettings>>;

/** Where the member shows up, in one line (same wording as the web profile's buttons). */
export function visibilitySubtitle(settings: DiscoverySettings | undefined, pending: boolean): string {
  if (pending) return 'Cargando…';
  if (!settings) return 'No se pudo cargar tu visibilidad';
  if (!settings.profileEnabled) return 'Perfil privado. Actívalo para aparecer en Conocer';
  return ['Visible en tu gimnasio', settings.crossGymEnabled ? 'otros gimnasios' : null, settings.mapEnabled ? 'mapa' : null].filter(Boolean).join(' · ');
}

/** «Conocer gente»: the web shows these controls inline; the phone links to their own screen. */
export function ConocerList() {
  const router = useRouter();
  const settings = useQuery({ queryKey: ['social', 'discovery-settings'], queryFn: socialService.getDiscoverySettings });
  return (
    <Section title="Conocer gente">
      <RowGroup>
        {[
          <NavRow
            key="conocer"
            leading={<RowGlyph icon="compass-outline" />}
            onPress={() => router.push('/conocer-ajustes')}
            subtitle={visibilitySubtitle(settings.data, settings.isPending)}
            testID="profile-conocer"
            title="Perfil social y preferencias"
          />,
        ]}
      </RowGroup>
    </Section>
  );
}

function dataSubtitle(profile: Profile | undefined, pending: boolean, missing: boolean): string {
  if (pending) return 'Cargando…';
  if (missing) return 'Añade peso, estatura y objetivo';
  if (!profile) return 'No se pudieron cargar tus datos';
  return `${profile.pesoKg.toLocaleString('es-ES')} kg · ${profile.estaturaCm} cm · ${GOAL_LABEL[profile.objetivo]}`;
}

export function AccountList({ profile, profilePending, missingProfile, onLogout, signingOut }: { profile: Profile | undefined; profilePending: boolean; missingProfile: boolean; onLogout: () => void; signingOut: boolean }) {
  const router = useRouter();
  const resetTour = useTourStore((state) => state.reset);
  const measurements = useQuery({ queryKey: ['profile', 'body-measurements'], queryFn: () => profileService.measurements() });
  const membership = useQuery({ queryKey: ['membership', 'me'], queryFn: () => membershipService.getMine() });
  const member = membership.data?.membership;
  return (
    <Section title="Tu cuenta">
      <RowGroup>
        {[
          <NavRow key="datos" leading={<RowGlyph icon="body-outline" />} onPress={() => router.push('/profile-data')} subtitle={dataSubtitle(profile, profilePending && !missingProfile, missingProfile)} testID="profile-data" title="Peso, estatura y objetivo" />,
          <NavRow
            key="peso"
            leading={<RowGlyph icon="scale-outline" />}
            onPress={() => router.push('/registrar-peso')}
            subtitle={weightRowSubtitle(measurements.data, measurements.isError, formatDate)}
            title="Registrar peso"
          />,
          membership.isError ? (
            <View key="membresia-error" style={{ paddingVertical: spacing.sm }}>
              <ErrorState error={membership.error} onRetry={() => void membership.refetch()} />
            </View>
          ) : (
            <NavRow
              key="membresia"
              leading={<RowGlyph icon="card-outline" />}
              meta={member ? <Badge label={MEMBERSHIP_LABEL[member.estado]} tone={MEMBERSHIP_TONE[member.estado]} /> : null}
              onPress={() => router.push('/membership')}
              subtitle={membership.isPending ? 'Cargando…' : member ? `${member.plan?.nombre ?? 'Plan actual'} · vence ${formatDate(member.venceEl)}` : 'Sin membresía asociada'}
              title="Membresía"
            />
          ),
          <NavRow key="notif" leading={<RowGlyph icon="notifications-outline" />} onPress={() => router.push('/notifications')} subtitle="Qué avisos quieres recibir" title="Notificaciones" />,
          <NavRow key="tour" leading={<RowGlyph icon="help-buoy-outline" />} onPress={() => void resetTour()} subtitle="Vuelve a ver la bienvenida y los avisos de cada pantalla" title="Ver tutorial" />,
          <NavRow key="ajustes" leading={<RowGlyph icon="settings-outline" />} onPress={() => router.push('/settings')} subtitle="Cuenta, versión y cierre de sesión" title="Ajustes" />,
          <LogoutRow key="logout" onPress={onLogout} pending={signingOut} />,
        ]}
      </RowGroup>
    </Section>
  );
}
