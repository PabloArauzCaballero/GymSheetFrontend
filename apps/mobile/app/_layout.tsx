import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { BrandIntro, useBrandIntroPending } from '@/components/brand-intro';
import { AppProviders } from '@/providers/app-providers';
import { useAuthStore } from '@/state/auth-store';
import { colors, useActiveTenant } from '@/theme';

export default function RootLayout() {
  const hydrate = useAuthStore((state) => state.hydrate);
  // El icono se dibuja con una fuente que se carga aparte, asi que en el primer
  // render sale un hueco. Da igual en una pestana, pero la primera pantalla que
  // ve alguien nuevo es el tutorial, y ahi el hueco es lo primero que se ve.
  // Esperar a la fuente cuesta unos milisegundos y evita esa primera impresion.
  const [fontsLoaded] = useFonts(Ionicons.font);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const tenant = useActiveTenant();

  /**
   * La cortinilla de marca.
   *
   * Se lee un booleano y no el estado completo de la sesión: `zustand` compara
   * lo que devuelve el selector, así que la raíz sólo se vuelve a renderizar el
   * día que la sesión pasa de «resolviendo» a resuelta, y no en cada cambio
   * posterior de sesión.
   */
  const sessionPending = useAuthStore((state) => state.status === 'loading');
  const introPending = useBrandIntroPending();

  /**
   * Antes, esta función devolvía `null` mientras cargaba la fuente de iconos.
   * Eso dejaba **pantalla negra muda** entre el splash nativo y el primer
   * render, y detrás venía el `ActivityIndicator` de `app/index.tsx` mientras se
   * resolvía la sesión: tres estados sin identidad seguidos.
   *
   * Ahora ese hueco lo ocupa la cortinilla, y —esto es lo importante— la
   * cortinilla se monta **por encima** del árbol, no en su lugar. El `Stack`
   * sigue esperando a la fuente exactamente igual que antes, pero esa espera
   * ocurre *detrás* de una escena que ya está corriendo. `BrandIntro` no depende
   * de la fuente, ni de los proveedores, ni de la sesión: sólo de Reanimated y
   * de los degradados, que están disponibles desde el primer fotograma. Así la
   * cortinilla no añade ni un milisegundo al arranque; se come el que ya se
   * perdía.
   *
   * `ready` es la otra mitad del contrato: si la sesión resuelve antes de que
   * termine la animación —lo normal—, el remate encadena sin pausa; si tarda
   * más, la cortinilla la espera (con su propio presupuesto máximo) en vez de
   * cortar a una pantalla que todavía no existe.
   */
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Fuera del árbol condicional: la barra de estado debe ser clara también
          durante la cortinilla, que es el único momento en que el árbol de
          abajo aún no existe. */}
      <StatusBar style="light" />

      {fontsLoaded ? (
        // La clave por marca remonta el árbol cuando cambia el gimnasio: los
        // estilos se calculan en cada render, así que basta con provocar uno
        // nuevo para que toda la interfaz adopte los colores de la cuenta que
        // acaba de entrar.
        <AppProviders key={tenant.id}>
          <Stack
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
          </Stack>
        </AppProviders>
      ) : null}

      {introPending ? <BrandIntro ready={fontsLoaded && !sessionPending} /> : null}
    </View>
  );
}
