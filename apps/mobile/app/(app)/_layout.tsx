import { useEffect } from 'react';
import { Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import ReAnimated, {
  Easing as ReEasing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useAuthStore } from '@/state/auth-store';
import { colors, fontSizes, iconSizes } from '@/theme';

/** Outline when resting, filled when active — the platform convention. */
const ICONS = {
  home: ['home-outline', 'home'],
  routines: ['albums-outline', 'albums'],
  exercises: ['barbell-outline', 'barbell'],
  workouts: ['flame-outline', 'flame'],
  profile: ['person-outline', 'person'],
} as const satisfies Record<
  string,
  readonly [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]
>;

/**
 * How far a scene travels on a tab change. Small on purpose: the tab bar is a
 * lateral switch, not a push, so the movement should read as the content
 * settling into place rather than as navigating somewhere else.
 */
const SCENE_TRAVEL = 28;

/**
 * Directional tab transition.
 *
 * `progress` is -1 when a screen sits to the left of the active tab, +1 when it
 * sits to the right. Feeding that straight into translateX means each section
 * enters from the side its own icon occupies in the bar: tapping Perfil (last)
 * brings it in from the right, tapping Inicio (first) from the left. The stock
 * `shift` preset moves everything the same way regardless, which is what makes
 * the bar feel like five unrelated screens rather than one strip you slide along.
 *
 * Fade and a slight scale ride along so the change still registers when two
 * sections look alike; travel alone would be nearly invisible between, say,
 * Rutinas and Ejercicios.
 */
const sceneStyleInterpolator = ({ current }: { current: { progress: Animated.Value } }) => ({
  sceneStyle: {
    opacity: current.progress.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [0, 1, 0],
    }),
    transform: [
      {
        translateX: current.progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [-SCENE_TRAVEL, 0, SCENE_TRAVEL],
        }),
      },
      {
        scale: current.progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [0.96, 1, 0.96],
        }),
      },
    ],
  },
});

/**
 * The icon answers the tap before the screen does. A tab bar where only the
 * fill changes gives no physical feedback, so the press reads as if nothing
 * happened until the content catches up.
 *
 * A spring rather than a timing curve: the settle is the whole point, and its
 * overshoot is what makes the bar feel responsive instead of merely correct.
 */
function tabIcon(screen: keyof typeof ICONS) {
  return function TabIcon({ color, focused }: { color: string; focused: boolean }) {
    const reduceMotion = useReducedMotion();
    const scale = useSharedValue(focused ? 1 : 0.9);
    /** Continuous breath, only while this tab is the active one. */
    const pulse = useSharedValue(0);

    useEffect(() => {
      const target = focused ? 1 : 0.9;
      if (reduceMotion) {
        scale.value = target;
        pulse.value = 0;
        return;
      }
      scale.value = withSpring(target, { damping: 11, stiffness: 260, mass: 0.6 });

      // The spring lands and then the icon is a static picture again. A slow
      // pulse on the active tab keeps the bar alive between taps — it is the
      // one element always on screen, so a still one makes the whole app feel
      // paused. Only the active icon breathes: five pulsing icons would be
      // noise, and the movement doubles as a marker of where you are.
      if (!focused) {
        cancelAnimation(pulse);
        pulse.value = withTiming(0, { duration: 220 });
        return;
      }
      pulse.value = withRepeat(
        withTiming(1, { duration: 2100, easing: ReEasing.inOut(ReEasing.sin) }),
        -1,
        true,
      );
    }, [focused, pulse, reduceMotion, scale]);

    const style = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value * (1 + pulse.value * 0.07) }],
    }));

    return (
      <ReAnimated.View style={style}>
        <Ionicons color={color} name={ICONS[screen][focused ? 1 : 0]} size={iconSizes.lg} />
      </ReAnimated.View>
    );
  };
}

/**
 * Five destinations, the ceiling for a bottom bar before labels start
 * truncating. Settings is reachable from Profile instead of taking a slot of
 * its own — it is visited rarely and belongs to the account.
 */
export default function AppLayout() {
  const status = useAuthStore((state) => state.status);

  // Protect the entire private group from unauthenticated access.
  if (status === 'unauthenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        sceneStyleInterpolator,
        transitionSpec: {
          animation: 'timing',
          config: {
            duration: 280,
            // Decelerating curve: the incoming section arrives quickly and
            // settles, instead of drifting in at a constant rate.
            easing: Easing.bezier(0.2, 0, 0, 1),
          },
        },
        tabBarActiveTintColor: colors.volt,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: fontSizes.xs, fontWeight: '600' },
        tabBarStyle: { backgroundColor: colors.surfaceLow, borderTopColor: colors.borderSubtle },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Inicio', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen
        name="routines"
        options={{ title: 'Rutinas', tabBarIcon: tabIcon('routines') }}
      />
      <Tabs.Screen
        name="exercises"
        options={{ title: 'Ejercicios', tabBarIcon: tabIcon('exercises') }}
      />
      <Tabs.Screen
        name="workouts"
        options={{ title: 'Entrenos', tabBarIcon: tabIcon('workouts') }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: tabIcon('profile') }} />
      {/* Reachable from Profile, not tabs of their own. */}
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="profile-edit" options={{ href: null }} />
      <Tabs.Screen name="membership" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
