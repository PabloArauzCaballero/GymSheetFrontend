import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Modal, Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedIconBadge } from '@/components/animated-icon-badge';
import { PressableScale } from '@/components/motion';
import {
  InteractionsBadge,
  interactionsAlertTotal,
  useInteractionCounts,
} from '@/components/interactions-counts';
import { accentHues, alpha, colors, fontSizes, iconSizes, ink, minTouchTarget, overlay, radii, reppJade, semibold, spacing } from '@/theme';

interface CommunityOverflowSheetProps {
  visible: boolean;
  onClose: () => void;
  onOpenTopGym: () => void;
  onOpenPreferences?: () => void;
  onStartTour?: () => void;
}

interface MenuItemProps {
  index: number;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  gradient: readonly [string, string];
  borderColor?: string;
  glowColor?: string;
  pulsing?: boolean;
  title: string;
  subtitle: string;
  onPress: () => void;
  badge?: React.ReactNode;
}

function MenuItem({
  index,
  icon,
  iconColor,
  gradient,
  borderColor,
  glowColor,
  pulsing,
  title,
  subtitle,
  onPress,
  badge,
}: MenuItemProps) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify().damping(17).mass(0.7)}>
      <PressableScale
        accessibilityLabel={title}
        haptic="selection"
        onPress={onPress}
        scaleTo={0.98}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.smd,
          paddingHorizontal: spacing.md,
          borderRadius: radii.xl,
          backgroundColor: colors.surfaceHigh,
          borderWidth: 1,
          borderColor: alpha(ink.white, 0.08),
          gap: spacing.md,
        }}
      >
        <AnimatedIconBadge
          borderColor={borderColor}
          glowColor={glowColor}
          gradient={gradient}
          icon={icon}
          iconColor={iconColor}
          iconSize={22}
          pulsing={pulsing}
          size={46}
        />

        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Text
              style={{
                color: colors.text,
                fontSize: fontSizes.md,
                fontWeight: semibold,
                letterSpacing: -0.2,
              }}
            >
              {title}
            </Text>
            {badge}
          </View>
          <Text
            numberOfLines={1}
            style={{
              color: colors.textMuted,
              fontSize: fontSizes.xs,
              lineHeight: 16,
            }}
          >
            {subtitle}
          </Text>
        </View>

        <Ionicons color={colors.borderControl} name="chevron-forward" size={iconSizes.sm} />
      </PressableScale>
    </Animated.View>
  );
}

export function CommunityOverflowSheet({
  visible,
  onClose,
  onOpenTopGym,
  onOpenPreferences,
  onStartTour,
}: CommunityOverflowSheetProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const counts = useInteractionCounts();
  const interactionsTotal = interactionsAlertTotal(counts.data);

  const navigateTo = (path: string) => {
    onClose();
    router.push(path as Href);
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: overlay.scrim }}>
        <Pressable accessible={false} onPress={onClose} style={{ flex: 1 }} />

        <View
          accessibilityViewIsModal
          style={{
            maxHeight: '85%',
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            backgroundColor: colors.surfaceLow,
            paddingTop: spacing.sm,
            paddingHorizontal: spacing.lg,
            paddingBottom: Math.max(insets.bottom, spacing.lg),
            gap: spacing.sm,
          }}
        >
          {/* iOS Grab Handle */}
          <View
            style={{
              width: 38,
              height: 4,
              borderRadius: 2,
              backgroundColor: alpha(ink.white, 0.25),
              alignSelf: 'center',
              marginBottom: 4,
            }}
          />

          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: spacing.xs,
            }}
          >
            <View style={{ gap: 2 }}>
              <Text
                accessibilityRole="header"
                style={{
                  color: colors.text,
                  fontSize: fontSizes.xl,
                  fontWeight: '700',
                  letterSpacing: -0.5,
                }}
              >
                Comunidad GymSheet
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                Explora el ecosistema, rankings y actividades
              </Text>
            </View>

            <Pressable
              accessibilityLabel="Cerrar menú"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => ({
                width: minTouchTarget,
                height: minTouchTarget,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radii.full,
                backgroundColor: colors.surfaceHigh,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Ionicons color={colors.text} name="close" size={iconSizes.md} />
            </Pressable>
          </View>

          {/* Menu Items */}
          <View style={{ gap: spacing.sm, paddingVertical: spacing.xs }}>
            {/* Preferencias de Búsqueda (Filtros) */}
            {onOpenPreferences ? (
              <MenuItem
                borderColor={alpha(reppJade, 0.45)}
                glowColor={colors.volt}
                gradient={[alpha(reppJade, 0.25), alpha(reppJade, 0.12)]}
                icon="options"
                iconColor={colors.volt}
                index={0}
                onPress={() => {
                  onClose();
                  setTimeout(() => {
                    onOpenPreferences();
                  }, 250);
                }}
                subtitle="Filtra por objetivos de entrenamiento, sedes y género"
                title="Preferencias de Búsqueda"
              />
            ) : null}

            {/* Top 15 Leaderboard */}
            <MenuItem
              borderColor={alpha(accentHues.gold, 0.45)}
              glowColor={accentHues.gold}
              gradient={[alpha(accentHues.gold, 0.28), alpha(reppJade, 0.14)]}
              icon="trophy"
              iconColor={accentHues.gold}
              index={1}
              onPress={() => {
                onClose();
                setTimeout(() => {
                  onOpenTopGym();
                }, 300);
              }}
              pulsing
              subtitle="Los 15 atletas con más puntos, insignias y rachas"
              title="Top 15 del Gym"
            />

            {/* Directorio */}
            <MenuItem
              borderColor={alpha(accentHues.sky, 0.45)}
              glowColor={accentHues.sky}
              gradient={[alpha(accentHues.sky, 0.28), alpha(accentHues.blueDeep, 0.14)]}
              icon="storefront"
              iconColor={accentHues.sky}
              index={1}
              onPress={() => navigateTo('/directorio')}
              subtitle="Gimnasios, tiendas de nutrición y coaches verificados"
              title="Directorio GymSheet"
            />

            {/* Mapa Social */}
            <MenuItem
              borderColor={alpha(accentHues.emerald, 0.45)}
              glowColor={accentHues.emerald}
              gradient={[alpha(accentHues.emerald, 0.28), alpha(accentHues.emeraldDeep, 0.14)]}
              icon="navigate"
              iconColor={accentHues.emeraldSoft}
              index={2}
              onPress={() => navigateTo('/social-map')}
              subtitle="Descubre quién está entrenando cerca de ti en el mapa"
              title="Mapa de Socios"
            />

            {/* Interacciones */}
            <MenuItem
              badge={interactionsTotal > 0 ? <InteractionsBadge total={interactionsTotal} /> : null}
              borderColor={alpha(accentHues.rose, 0.45)}
              glowColor={accentHues.rose}
              gradient={[alpha(accentHues.rose, 0.28), alpha(accentHues.roseDeep, 0.14)]}
              icon="heart"
              iconColor={accentHues.roseSoft}
              index={3}
              onPress={() => navigateTo('/interacciones')}
              pulsing={interactionsTotal > 0}
              subtitle="Likes recibidos, visitas a tu perfil y solicitudes"
              title="Tus Interacciones"
            />

            {/* Personas Bloqueadas */}
            <MenuItem
              borderColor={alpha(accentHues.slate, 0.4)}
              glowColor={accentHues.slate}
              gradient={[alpha(accentHues.slate, 0.24), alpha(accentHues.slateDeep, 0.14)]}
              icon="shield-checkmark"
              iconColor={accentHues.slateSoft}
              index={4}
              onPress={() => navigateTo('/personas-bloqueadas')}
              subtitle="Privacidad y control de usuarios bloqueados"
              title="Personas Bloqueadas"
            />

            {/* Tour / Ayuda */}
            {onStartTour ? (
              <MenuItem
                borderColor={alpha(accentHues.purple, 0.45)}
                glowColor={accentHues.purple}
                gradient={[alpha(accentHues.purple, 0.28), alpha(accentHues.purpleDeep, 0.14)]}
                icon="sparkles"
                iconColor={accentHues.purpleSoft}
                index={5}
                onPress={() => {
                  onClose();
                  onStartTour();
                }}
                subtitle="Aprende cómo deslizar, hacer match y conectar"
                title="Tour de Comunidad"
              />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}
