import { Tabs } from 'expo-router';

/**
 * Tabs of the business shell (plan §4.2): Inicio · Publicaciones · Pedidos ·
 * Mensajes · Más. Only Inicio exists in franja 8a, so the bar stays hidden: a
 * bar with one destination is noise. Each tab is added with its franja (8c–8f).
 */
export default function BusinessTabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
    </Tabs>
  );
}
