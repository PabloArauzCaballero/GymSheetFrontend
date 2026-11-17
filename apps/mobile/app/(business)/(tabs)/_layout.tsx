import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors, iconSizes } from '@/theme';

const ICONS = {
  index: ['home-outline', 'home'],
  publicaciones: ['pricetags-outline', 'pricetags'],
  perfil: ['storefront-outline', 'storefront'],
} as const satisfies Record<string, readonly [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]>;

/**
 * Tabs of the business shell (plan §4.2): Inicio · Publicaciones · Perfil
 * (franja 8c). Pedidos and Mensajes join with franjas 8d and 8f. No person
 * tabs here. Selected in the text tone, never in accent (repp-diseno §2).
 */
export default function BusinessTabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surfaceLowest, borderTopColor: colors.borderSubtle },
        tabBarIcon: ({ focused, color }) => {
          const pair = ICONS[route.name as keyof typeof ICONS] ?? ICONS.index;
          return <Ionicons color={color} name={focused ? pair[1] : pair[0]} size={iconSizes.md} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="publicaciones" options={{ title: 'Publicaciones' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
