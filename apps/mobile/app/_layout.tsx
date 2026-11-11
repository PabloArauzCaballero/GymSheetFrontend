import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '@/providers/app-providers';
import { BrandIntro } from '@/splash/brand-intro';
import { useAuthStore } from '@/state/auth-store';
import { colors, useActiveTenant } from '@/theme';

// El splash nativo se suelta a mano, cuando el primer cuadro de la entrada de
// marca ya está pintado; así nunca asoma un cuadro intermedio entre los dos.
// Sin el módulo nativo de splash la llamada no hace nada y el relevo ocurre
// igualmente en el primer render.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function releaseNativeSplash() {
  void SplashScreen.hideAsync().catch(() => undefined);
}

/**
 * Entrada de marca con su condición de entrega.
 *
 * Vive aparte para que sea este componente, y no la raíz, el que se suscriba al
 * estado de sesión: la raíz no tiene por qué repintarse en cada inicio o cierre
 * de sesión.
 */
function IntroGate({ fontsLoaded, onDone }: { fontsLoaded: boolean; onDone: () => void }) {
  const sessionResolved = useAuthStore((state) => state.status !== 'loading');
  return (
    <BrandIntro
      appReady={fontsLoaded && sessionResolved}
      onDone={onDone}
      onFirstFrame={releaseNativeSplash}
    />
  );
}

export default function RootLayout() {
  const hydrate = useAuthStore((state) => state.hydrate);
  // El icono se dibuja con una fuente que se carga aparte, asi que en el primer
  // render sale un hueco. Da igual en una pestana, pero la primera pantalla que
  // ve alguien nuevo es el tutorial, y ahi el hueco es lo primero que se ve.
  // Esperar a la fuente cuesta unos milisegundos y evita esa primera impresion.
  const [fontsLoaded] = useFonts(Ionicons.font);
  const [introVisible, setIntroVisible] = useState(true);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const tenant = useActiveTenant();
  const dismissIntro = useCallback(() => setIntroVisible(false), []);

  return (
    // Negro de fondo: es el color del splash nativo y de la app, asi que la
    // espera por la fuente se lee como parte del arranque y no como una
    // pantalla mas.
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />
      {fontsLoaded ? (
        // La clave por marca remonta el árbol cuando cambia el gimnasio: los estilos
        // se calculan en cada render, así que basta con provocar uno nuevo para que
        // toda la interfaz adopte los colores de la cuenta que acaba de entrar.
        <AppProviders key={tenant.id}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
          </Stack>
        </AppProviders>
      ) : null}
      {/* Encima de la aplicación y fuera de sus proveedores: la sesión y las
          rutas se resuelven debajo mientras la marca se arma, y un cambio de
          gimnasio que remonte el árbol no reinicia la entrada. */}
      {introVisible ? <IntroGate fontsLoaded={fontsLoaded} onDone={dismissIntro} /> : null}
    </View>
  );
}
