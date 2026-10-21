import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedIconBadge } from '@/components/animated-icon-badge';
import { PressableScale } from '@/components/motion';
import {
  InteractionsBadge,
  interactionsAlertTotal,
  useInteractionCounts,
} from '@/components/interactions-counts';
import {
  colors,
  fontSizes,
  iconSizes,
  minTouchTarget,
  overlay,
  radii,
  semibold,
  spacing,
} from '@/theme';

interface CommunityOverflowSheetProps {
  visible: boolean;
  onClose: () => void;
  onOpenTopGym: () => void;
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
          borderColor: 'rgba(255, 255, 255, 0.08)',
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
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
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
            {/* Top 15 Leaderboard */}
            <MenuItem
              borderColor="rgba(255, 215, 0, 0.45)"
              glowColor="#FFD700"
              gradient={['rgba(255, 215, 0, 0.28)', 'rgba(46, 139, 123, 0.14)']}
              icon="trophy"
              iconColor="#FFD700"
              index={0}
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
              borderColor="rgba(56, 189, 248, 0.45)"
              glowColor="#38BDF8"
              gradient={['rgba(56, 189, 248, 0.28)', 'rgba(30, 58, 138, 0.14)']}
              icon="storefront"
              iconColor="#38BDF8"
              index={1}
              onPress={() => navigateTo('/directorio')}
              subtitle="Gimnasios, tiendas de nutrición y coaches verificados"
              title="Directorio GymSheet"
            />

            {/* Mapa Social */}
            <MenuItem
              borderColor="rgba(16, 185, 129, 0.45)"
              glowColor="#10B981"
              gradient={['rgba(16, 185, 129, 0.28)', 'rgba(6, 78, 59, 0.14)']}
              icon="navigate"
              iconColor="#34D399"
              index={2}
              onPress={() => navigateTo('/social-map')}
              subtitle="Descubre quién está entrenando cerca de ti en el mapa"
              title="Mapa de Socios"
            />

            {/* Interacciones */}
            <MenuItem
              badge={interactionsTotal > 0 ? <InteractionsBadge total={interactionsTotal} /> : null}
              borderColor="rgba(244, 63, 94, 0.45)"
              glowColor="#F43F5E"
              gradient={['rgba(244, 63, 94, 0.28)', 'rgba(136, 19, 55, 0.14)']}
              icon="heart"
              iconColor="#FB7185"
              index={3}
              onPress={() => navigateTo('/interacciones')}
              pulsing={interactionsTotal > 0}
              subtitle="Likes recibidos, visitas a tu perfil y solicitudes"
              title="Tus Interacciones"
            />

            {/* Personas Bloqueadas */}
            <MenuItem
              borderColor="rgba(148, 163, 184, 0.4)"
              glowColor="#94A3B8"
              gradient={['rgba(148, 163, 184, 0.24)', 'rgba(30, 41, 59, 0.14)']}
              icon="shield-checkmark"
              iconColor="#CBD5E1"
              index={4}
              onPress={() => navigateTo('/personas-bloqueadas')}
              subtitle="Privacidad y control de usuarios bloqueados"
              title="Personas Bloqueadas"
            />

            {/* Tour / Ayuda */}
            {onStartTour ? (
              <MenuItem
                borderColor="rgba(168, 85, 247, 0.45)"
                glowColor="#A855F7"
                gradient={['rgba(168, 85, 247, 0.28)', 'rgba(88, 28, 135, 0.14)']}
                icon="sparkles"
                iconColor="#C084FC"
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
