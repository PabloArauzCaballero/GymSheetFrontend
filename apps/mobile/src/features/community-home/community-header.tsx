import { useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { socialService } from '@/api/services';
import { TourHelpButton } from '@/components/layout';
import { TourTarget } from '@/components/tour';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { InteractionsBadge, interactionsAlertTotal, useInteractionCounts } from '@/components/interactions-counts';
import { accentPolicy, colors, iconSizes, minTouchTarget, radii, spacing } from '@/theme';

/** Acceso rápido con texto: se lee sin adivinar qué hace un icono. */
function QuickChip({
  icon,
  label,
  accessibilityLabel,
  onPress,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
  badge?: React.ReactNode;
}) {
  return (
    <PressableScale
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={{ top: 2, bottom: 2 }}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs + 2,
        minHeight: minTouchTarget - 4,
        paddingHorizontal: spacing.md,
        borderRadius: radii.full,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceLow,
      }}
    >
      <Ionicons
        accessibilityElementsHidden
        color={accentPolicy.glyph}
        importantForAccessibility="no-hide-descendants"
        name={icon}
        size={iconSizes.sm}
      />
      <Text strong tone="secondary" variant="subhead">
        {label}
      </Text>
      {badge}
    </PressableScale>
  );
}

/**
 * Cabecera de Comunidad: el título, Mensajes como la acción de la esquina (la
 * que más se usa) y debajo accesos con texto. La ayuda «?» queda pequeña. Las
 * rutas, etiquetas de accesibilidad y contadores son los de siempre.
 */
export function CommunityHeader({ onDiscover }: { onDiscover: () => void }) {
  const router = useRouter();
  // Mismo dato que alimenta la pestaña "Te escribieron" de Mensajes.
  const pending = useQuery({
    queryKey: ['social', 'connections', 'PENDING'],
    queryFn: () => socialService.listConnections('PENDING'),
    staleTime: 30_000,
  });
  const hasPendingReceived = (pending.data ?? []).some((connection) => connection.direction === 'RECEIVED');
  const counts = useInteractionCounts();
  const interactionsTotal = interactionsAlertTotal(counts.data);

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1 }} variant="display">
          Comunidad
        </Text>
        <TourHelpButton tourKey="comunidad" />
        <PressableScale
          accessibilityLabel="Mensajes y solicitudes"
          onPress={() => router.push('/comunidad-mensajes')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs + 2,
            height: minTouchTarget,
            paddingHorizontal: spacing.md,
            borderRadius: radii.full,
            borderCurve: 'continuous',
            backgroundColor: colors.surfaceHighest,
          }}
        >
          <Ionicons color={colors.text} name="chatbubbles" size={iconSizes.md} />
          <Text strong variant="subhead">
            Mensajes
          </Text>
          {hasPendingReceived ? (
            <View
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 12,
                height: 12,
                borderRadius: radii.full,
                backgroundColor: colors.volt,
                borderWidth: 2,
                borderColor: colors.background,
              }}
            />
          ) : null}
        </PressableScale>
      </View>

      <Text tone="muted" variant="subhead">
        Socios de tu gimnasio, filtrados por lo que buscas.
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <QuickChip
          accessibilityLabel="Explorar personas y gimnasios en el mapa"
          icon="map-outline"
          label="Mapa"
          onPress={() => router.push('/social-map' as Href)}
        />
        <QuickChip
          accessibilityLabel={
            interactionsTotal > 0
              ? `Interacciones, ${interactionsTotal} ${interactionsTotal === 1 ? 'novedad' : 'novedades'}`
              : 'Interacciones'
          }
          badge={<InteractionsBadgeInline total={interactionsTotal} />}
          icon="heart-outline"
          label="Te dieron like"
          onPress={() => router.push('/interacciones')}
        />
        <TourTarget id="comunidad.discover">
          <QuickChip
            accessibilityLabel="Descubrir socios uno a uno"
            icon="flame-outline"
            label="Descubrir"
            onPress={onDiscover}
          />
        </TourTarget>
      </View>
    </View>
  );
}

/** El contador, dentro del chip: el badge de la esquina del icono no cabe en una píldora. */
function InteractionsBadgeInline({ total }: { total: number }) {
  if (total <= 0) return null;
  return (
    <View style={{ width: 20, height: 20 }}>
      <InteractionsBadge total={total} />
    </View>
  );
}
