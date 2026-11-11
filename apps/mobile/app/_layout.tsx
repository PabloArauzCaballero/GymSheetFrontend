import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '@/providers/app-providers';
import { BrandIntro } from '@/splash/brand-intro';
import { useAuthStore } from '@/state/auth-store';
import { useIntroStore } from '@/state/intro-store';
import { colors, useActiveTenant } from '@/theme';

// Relevo con el splash nativo — lo que hay y lo que no.
//
// Hoy `expo-splash-screen` NO está instalado, así que no existe el módulo
// nativo `ExpoSplashScreen` y estas dos llamadas (expo-router las reexporta) no
// hacen nada: el sistema retira el splash por su cuenta cuando React pinta su
// primera vista. La continuidad depende, por tanto, de una sola cosa: que el
// fondo sea `#000000` tanto en el splash nativo (`app.json`) como en el primer
// cuadro de la entrada de marca, que no dibuja nada más.
//
// Se dejan escritas porque son inocuas y porque, el día que se instale
// `expo-splash-screen` (con su plugin en `app.json` y una compilación nativa
// nueva), pasan a retener el splash hasta que la entrada esté en pantalla, que
// es el relevo controlado de verdad.
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
function IntroGate({ appMounted, onDone }: { appMounted: boolean; onDone: () => void }) {
  const sessionResolved = useAuthStore((state) => state.status !== 'loading');
  return (
    <BrandIntro
      appReady={appMounted && sessionResolved}
      onDone={onDone}
      onFirstFrame={releaseNativeSplash}
    />
  );
}

export default function RootLayout() {
  const hydrate = useAuthStore((state) => state.hydrate);
  const finishIntro = useIntroStore((state) => state.finish);
  // El icono se dibuja con una fuente que se carga aparte, asi que en el primer
  // render sale un hueco. Da igual en una pestana, pero la primera pantalla que
  // ve alguien nuevo es el tutorial, y ahi el hueco es lo primero que se ve.
  // Esperar a la fuente cuesta unos milisegundos y evita esa primera impresion.
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);
  // Si la fuente falla, la aplicación se monta igual: unos iconos en blanco son
  // un defecto menor; quedarse para siempre en una pantalla negra, no.
  const appMounted = fontsLoaded || fontError != null;
  const [introVisible, setIntroVisible] = useState(true);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const tenant = useActiveTenant();
  const dismissIntro = useCallback(() => {
    setIntroVisible(false);
    // Lo que se presenta solo (el tutorial) esperaba a esta señal.
    finishIntro();
  }, [finishIntro]);

  return (
    // Negro de fondo: es el color del splash nativo y de la app, asi que la
    // espera por la fuente se lee como parte del arranque y no como una
    // pantalla mas.
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />
      {/* Mientras la entrada tapa la pantalla, el lector de pantalla no debe
          encontrar la aplicación que hay debajo. */}
      <View
        accessibilityElementsHidden={introVisible}
        importantForAccessibility={introVisible ? 'no-hide-descendants' : 'auto'}
        style={{ flex: 1 }}
      >
        {appMounted ? (
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
      </View>
      {/* Encima de la aplicación y fuera de sus proveedores: la sesión y las
          rutas se resuelven debajo mientras la marca se arma, y un cambio de
          gimnasio que remonte el árbol no reinicia la entrada. */}
      {introVisible ? <IntroGate appMounted={appMounted} onDone={dismissIntro} /> : null}
    </View>
  );
}
