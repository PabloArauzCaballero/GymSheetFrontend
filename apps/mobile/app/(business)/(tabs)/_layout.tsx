import { Ionicons } from '@expo/vector-icons';
import { queryKeys } from '@gymsheet/hooks';
import { useQuery } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import { businessOrdersService } from '@/features/orders/orders-service';
import { colors, iconSizes } from '@/theme';

const ICONS = {
  index: ['home-outline', 'home'],
  publicaciones: ['pricetags-outline', 'pricetags'],
  pedidos: ['receipt-outline', 'receipt'],
  perfil: ['storefront-outline', 'storefront'],
} as const satisfies Record<string, readonly [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]>;

/**
 * Tabs of the business shell (plan §4.2): Inicio · Publicaciones · Pedidos ·
 * Perfil (franjas 8c–8d); Mensajes joins with 8f. «Pedidos» carries the «Por
 * confirmar» count. No person tabs here. Selected in the text tone, never in
 * accent (repp-diseno §2).
 */
export default function BusinessTabsLayout() {
  const badge = useQuery({ queryKey: queryKeys.business.ordersBadge, queryFn: () => businessOrdersService.list({ limit: 1 }), refetchInterval: 60_000, staleTime: 30_000 });
  const pending = badge.data?.pendingCount ?? 0;
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
      <Tabs.Screen
        name="pedidos"
        options={{
          title: 'Pedidos',
          tabBarBadge: pending > 0 ? pending : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.text, color: colors.background },
          tabBarAccessibilityLabel: pending > 0 ? `Pedidos, ${pending} por confirmar` : 'Pedidos',
        }}
      />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
