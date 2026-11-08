# Viabilidad de capturas de la app móvil en navegador (H0.S2.M1)

Fecha: 2026-10-24. Solo lectura: no se instaló ni se editó nada, y **no se ejecutó la app**.
Cada afirmación cita archivo:línea del repo, o la caché de Yarn
(`/usr/local/share/.cache/yarn/v6`) cuando se dice «paquete en caché». Cuando algo no
se pudo comprobar sin `node_modules`, se marca **NO VERIFICADO**.

## Veredicto

**VIABLE CON ESFUERZO, como aproximación provisional.** Expo web (react-native-web) no
sustituye al simulador iOS. El plan (`fases/H0-H1-preflight-y-cimientos.md:31`) pide
Maestro sobre iPhone SE y 15 Pro Max, y eso sigue necesitando la máquina de Pablo.
Hoy no arranca en web: falta `react-native-web`, el token no se guarda y no hay backend ni
CORS para ese origen. Todo eso se resuelve con pasos concretos (abajo), sin tocar el
código de producción salvo un shim de almacenamiento.

El camino con el shim `rn-dom` (alternativa A) **no sirve** para una línea base visual:
no pinta estilos.

## 1. Estado del soporte web en `apps/mobile`

| Requisito | Estado | Evidencia |
|---|---|---|
| `react-native-web` | **Ausente.** No está en `package.json` ni como paquete resuelto en `yarn.lock`. Solo aparece `babel-plugin-react-native-web` (lo trae `babel-preset-expo`). | `apps/mobile/package.json:42-85` (dependencias); `yarn.lock:3193` |
| `react-dom` | Presente, 19.2.3 | `package.json:70` |
| `@expo/metro-runtime` | No es dependencia directa; llega por `expo-router`. Existe en `yarn.lock:1193` | `yarn.lock:4580` |
| Script `web` / `expo export --platform web` | **No existe.** Scripts: `start`, `go`, `go:tunnel`, `android`, `ios`… | `package.json:6-24` |
| Config `web` en Expo | **No hay clave `web`** (ni bundler ni output) en `app.json` ni `app.config.js` | `app.json:2-108`, `app.config.js:16-25` |
| Metro | Config de monorepo para móvil; sin ajustes web | `metro.config.js:1-40` |
| Babel | `babel-preset-expo` sin más | `babel.config.js:6` |
| Precedente | Un `expo export` sin `--platform` falló porque `react-native-web` «no está instalado» | `docs/trabajo/2026-10-08-social-recomendaciones/evidencia/h10-android-export-2026-10-12.md:15` |
| `react-native-web` esperado por Expo | `expo-router` lo declara como peer opcional y lo prueba con `~0.21.0` (paquete en caché) | `expo-router-57.0.24/package.json:96,112,140` |

Dependencias nativas, según los archivos `.web.*` de los paquetes en caché (versiones del lock; **NO VERIFICADO** que la app los use sin fallo en web):

- Con implementación web en el paquete: `expo-audio`, `expo-video`, `expo-blur`, `expo-haptics`, `expo-notifications`, `expo-location`, `expo-image`, `expo-linear-gradient`, `expo-image-picker`, `expo-clipboard`, `expo-sharing`, `expo-file-system`, `expo-document-picker`, `expo-font`, `expo-constants`, `expo-device`, `expo-updates`, `expo-keep-awake`, `expo-system-ui`, `react-native-reanimated` (31 archivos web), `react-native-gesture-handler` (11), `react-native-screens`, `react-native-svg`.
- `@sentry/react-native` no estaba en la caché: **NO VERIFICADO**.
- **`expo-secure-store`: sin implementación real en web.** `ExpoSecureStore.web.ts` es solo `export default {};`. `getItemAsync` llama a `ExpoSecureStore.getValueWithKeyAsync(...)` (`SecureStore.ts:151-157` en el paquete en caché), que en web es `undefined` y lanza `TypeError`. `isAvailableAsync` devuelve `false` (`SecureStore.ts:115-117`).
- **`react-native-maps`: solo un stub.** `MapView.web.ts` reexporta `UnimplementedView` de react-native-web. Es peer opcional de `react-native-web` (`package.json` del paquete, líneas 54-60). `Marker`, `Region` y compañía se importan en `src/features/place-picker/place-picker.tsx:6` y `app/(app)/social-map.tsx:6`. Esas dos pantallas (mapa social y selector de lugar del chat, `chat/lugar.tsx`) saldrían vacías o fallarían: **NO VERIFICADO** qué pasa con `Marker`.

Soporte web ya presente en el código (poco, pero existe): `Platform.OS === 'web'` en
`src/api/local-file-part.ts:21` (sube blobs), `src/features/chat/use-voice-note.ts:149`,
`src/features/session-summary/session-records.tsx:31` (omite hápticos). No hay archivos
`*.web.tsx` en `apps/mobile` (búsqueda `find -name "*.web.*"`: sin resultados).
El resto de `Platform.OS` solo distingue ios/android (p. ej. `src/components/ui.tsx:60`,
`src/components/layout.tsx:289`, `src/theme/type.ts:52`, `app/(app)/chat/[id].tsx:1306`).

Otros puntos del arranque que afectan a web:

- Navegación de pestañas: `app/(app)/(tabs)/_layout.tsx:8-12` importa de
  `expo-router/build/react-navigation/bottom-tabs` (ruta interna), más `BlurView`, `Haptics` y Reanimated. **NO VERIFICADO** en web.
- `GestureHandlerRootView` envuelve toda la app (`src/providers/app-providers.tsx:45`).
- Cortinilla de marca al arrancar (`app/_layout.tsx:92`, `src/components/brand-intro.tsx`): hay que esperarla. Respeta `useReducedMotion` (`brand-intro.tsx:342`), así que Playwright con `reducedMotion: 'reduce'` la acorta.
- Fuentes: `useFonts` con Ionicons y Bricolage (`app/_layout.tsx:26-30`); si falla, sigue con la del sistema, y la captura saldría con tipografía distinta sin avisar.
- Inserciones seguras: `SafeAreaProvider` (`app-providers.tsx:46`). En web las inserciones son 0 (**NO VERIFICADO**), de modo que no habrá notch ni indicador de inicio; la barra inferior no se verá igual que en iPhone.

## 2. Sesión, URL del backend y CORS

- **URL.** `src/config/env.ts:58-61`: `process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl` y `required(...)` **lanza al importar** si falta. No existe `apps/mobile/.env` (solo `.env.example:14`, que apunta a `http://localhost:3011/api/v1`, no 3005). Hay que exportar `EXPO_PUBLIC_API_URL=http://localhost:3005/api/v1` antes de `expo start`/`expo export`.
- `forDevice` (`env.ts:49-56`): en web con `localhost` queda `localhost` salvo que Metro dé una IP en `hostUri` (`env.ts:25-29`); en el mismo contenedor da igual.
- `scripts/check-api-url.mjs` solo corre en EAS (`package.json:eas-build-pre-install`) y **rechaza** localhost (`check-api-url.mjs:55-61`). No estorba en dev.
- **Login.** `auth-store.ts` hace `POST /auth/login` y luego `secureStoreAuthStorage.saveTokens` (`auth-store.ts:123`, `storage/secure-store.ts:21-24`). En web ese `saveTokens` lanza (ver arriba), así que el login falla *después* de que el backend responde OK. `hydrate` y `principalCache` también usan SecureStore (`secure-store.ts:15-55`).
- **Cada petición autenticada** espera el token antes de enviarse: `packages/api-client/src/client.ts:123` (`await tokenProvider.getAccessToken()`), sin `try/catch`. Sin shim, ni siquiera una llamada con sesión puede salir.
- Otros usos directos de SecureStore: `src/state/tour-store.ts:151,192,236` (con `try/catch`, `:148-160`), `src/components/celebration/level-up.ts:92,97,129`, `src/state/routine-draft-store.ts`, `src/features/arena-road/use-arena-unlock.ts`. Un shim por plataforma lo resuelve de golpe.
- Política del repo: «Web Storage está explícitamente prohibido para tokens» (`packages/auth/src/storage.ts:8`). Un shim web con `localStorage` solo es aceptable como herramienta de capturas, fuera de `main` o tras una variable de entorno.
- **CORS.** `GymSheetBackend/src/main.ts:109-115`: `origin: env.CORS_ORIGINS`, métodos GET/HEAD/POST/PUT/PATCH/DELETE/OPTIONS, `allowedHeaders: Authorization, Content-Type, X-Request-Id`. El cliente solo envía `Accept`, `X-Request-ID`, `Content-Type`, `Authorization` (`client.ts:119-123`), todos admitidos. Valor por defecto `http://localhost:5173` (`src/config/env.ts:58`); `.env.example:12` lista 5173, 3000 y 3002. **Ni 8081 (Expo web dev) ni el puerto donde se sirva un `expo export` están**, así que hay que arrancar el backend con `CORS_ORIGINS` que incluya el origen de la web.
- Imágenes: helmet pone `crossOriginResourcePolicy: same-site` (`main.ts:43`). `localhost:8081` y `localhost:3005` son *same-site* (el puerto no cuenta), así que no debería bloquear. **NO VERIFICADO** en navegador.
- Socket del chat: `src/hooks/use-chat-socket.ts` usa `new URL(env.apiUrl).origin`, y el gateway lleva su propio CORS: `src/modules/chat/chat.gateway.ts:58`. Misma variable.
- Estado del entorno al investigar: **nada escucha en 3005** (`curl` a `/api/v1/health/live` dio código 000), `GymSheetBackend` no tiene `node_modules` ni `.env`. Sí hay `psql`, `docker` y `redis-server` en el contenedor.

## 3. Evidencia previa de ejecución en web

Ninguna. Lo que hay:

- `apps/mobile/ios-evidence/*.png` y `docs/mobile/ios-evidencia.md:3`: capturas de Maestro en el simulador iOS (iPhone 17 Pro).
- `apps/mobile/.maestro/` (flujos 01-24, con `takeScreenshot` p. ej. `24-dia-superserie.yaml:22`). **No existe `00-baseline-capturas.yaml`**.
- `apps/mobile/tools/` solo contiene `anatomy` (scripts Python de mapa muscular), nada de capturas.
- Una búsqueda de `expo start --web`, `--platform web`, `react-native-web` y `expo export` en `docs/`, `README`, `CLAUDE.md` y `AGENTS.md` solo dio el fallo de `react-native-web` del h10 arriba citado.
- Los tres `Platform.OS === 'web'` del código sugieren que alguien contempló la web, pero no hay prueba de un arranque.

## 4. Alternativas

### A. Pruebas de componentes con el shim `rn-dom` + vitest, capturadas con Playwright

- Qué hay: `src/features/chat/__tests__/rn-dom.tsx` sustituye cada primitiva por un elemento HTML. **No pasa `style`**: `Box`, `Press` y `Txt` solo reenvían `aria-label` y `data-testid` (`rn-dom.tsx:14-36`). `StyleSheet.create` devuelve los estilos sin usarlos (`:96`), el tema es un `Proxy` que devuelve `'black'` o `8` (`:107-135`), Reanimated y gestos son maquetas vacías, SVG renderiza `null`.
- Cobertura: solo el chat (`chat-thread`, `chat-composer`, `chat-place`, `use-voice-note`) y `social-map-screen.test.tsx`, con configs `vitest` propias (`src/features/chat/vitest.config.mts`, `src/features/social-map/vitest.config.mts`) que cuelgan de `apps/web/vitest.config`.
- Pros: arranca sin Metro ni backend; ya pasa en CI.
- Contras: saldrían páginas HTML sin colores, sin tipografía, sin espaciado. **No sirve para el inventario anti-slop** (H0.S2.M2) ni para before/after.
- Esfuerzo: bajo, valor para el objetivo: nulo. Útil solo como prueba estructural.

### B. Expo web (react-native-web) + Playwright (este es el camino «viable con esfuerzo»)

Pros: renderiza los estilos reales, el tema real, Bricolage, `BlurView`, degradados y la navegación real de Expo Router. Se pueden fijar 375×667 y 430×932 con `deviceScaleFactor: 3`. Sirve para el inventario anti-slop (contraste, jerarquía, copy, estados vacíos).
Contras: no es iOS (sombras, `BlurView`, fuentes del sistema, `KeyboardAvoidingView`, `RefreshControl` iOS, ausencia de inserciones seguras y mapas). No debe presentarse como equivalente a las capturas del simulador.

Pasos:

1. Dependencia: `react-native-web@~0.21.0` en `apps/mobile` (app en `nohoist`, `package.json` raíz). Cambia `package.json` y `yarn.lock`: hacerlo en una copia/rama de trabajo o con instalación sin guardar, no en `main`. Comprobar que `expo export --platform web` empaqueta.
2. Shim de almacenamiento: `src/storage/secure-store.web.ts` (Metro prefiere `.web.ts`) con la misma interfaz `secureStoreAuthStorage`, `principalCache`, `secureStoreTokenProvider`, sobre `localStorage`. Los demás módulos que importan `expo-secure-store` directamente (lista arriba) piden otro shim o un alias de Metro para `expo-secure-store`.
3. Mapas: excluir `social-map` y `chat/lugar` de la tanda, o simular `react-native-maps` con un alias de Metro.
4. Backend: instalar y levantar `GymSheetBackend` con Postgres y Redis, seeds (`yarn db:seed:*`, `package.json:61-65` del backend) y `CORS_ORIGINS=<origen web>`; exportar `EXPO_PUBLIC_API_URL=http://localhost:3005/api/v1`. Alternativa sin backend: interceptar con `page.route` y contestar con JSON que cumpla los esquemas `zod` de `@gymsheet/schemas` (más trabajo, pero reproducible).
5. Navegación: ~60 pantallas (68 archivos `.tsx` en `app/` menos 8 `_layout`). Las rutas dinámicas (`[id]`, `[userId]`, `[diaId]`…) necesitan ids semilla. El plan dice ~45.
6. Script Playwright: login, esperar la cortinilla de marca (`reducedMotion: 'reduce'`), recorrer las rutas, `page.screenshot` a 375 y 430. Fijar reloj/animaciones; esperar fuentes antes de cada captura.
7. Rotular cada PNG «web-RNW, aproximación» y no mezclarlos con `ios-evidence`.

Esfuerzo (estimación mía, no medida): spike de arranque con 1 pantalla, 0,5-1 día; 4 pestañas + áreas de los tres hitos (~12-15 pantallas), 1-2 días más; las ~45, 3+ días con los ajustes por pantalla que fallen en web.

### C. Harness tipo Storybook (rutas de galería con datos fijos)

Una ruta o app de galería que monta cada pantalla con datos sintéticos. Requiere igualmente `react-native-web` (B-1 y B-2). Pros: determinista y sin backend. Contras: hay que escribir o mockear el árbol de proveedores y los hooks de datos por pantalla (React Query, stores zustand); es código nuevo en un repo que ya tiene el fixture H5 solo para descubrir (`src/api/h5-s2-m1-fixture.ts`, `.env.example:19-22`). Esfuerzo medio-alto; solo compensa si se va a reutilizar en H1+.

### D. Dejar H0.S2.M1 como BLOCKED

Declarar que la definición de terminado («iPhone SE y 15 Pro Max», `evidencia/baseline/*.png`) requiere simulador y Maestro, o sea la máquina de Pablo (`docs/mobile/ios-evidencia.md:3`, flujo `00-baseline-capturas.yaml` todavía inexistente). Pros: honesto, cero riesgo de evidencia engañosa. Contras: H0.S2.M2 y H0.S2.M3 (inventario anti-slop y prioridad) y los before/after de H1.S3.M1 quedan sin base visual hasta que Pablo ejecute.

## Recomendación

1. Marcar **H0.S2.M1 como BLOCKED (simulador)** y entregar, en la máquina de Pablo, el flujo `00-baseline-capturas.yaml`. Se puede redactar aquí sin ejecutarlo.
2. En paralelo, si Pablo acepta una línea base provisional: opción **B acotada** a las 4 pestañas y a las pantallas de mensajería, marketplace/catálogo y música (~12-15), rotuladas como aproximación web. Alimenta H0.S2.M2/M3, nunca sustituye al DoD de M1.
3. No usar el shim `rn-dom` para capturas (opción A).
4. Antes de invertir en B, hacer el spike (pasos 1-2 con una sola pantalla de login) para confirmar que Metro empaqueta web con Reanimated 4.5.1, `react-native-worklets` 0.10.1 y las pestañas de `expo-router/build/...`. Esas piezas no se pudieron verificar sin `node_modules`.

## Lo que NO se verificó

Que Metro empaquete para web; el comportamiento de Reanimated 4, `react-native-worklets`, `@sentry/react-native` y `Marker` de `react-native-maps` en web; las inserciones seguras en web; el CORP de las imágenes; que `react-native-web@~0.21` sea compatible con React 19.2.3 y RN 0.86.3 (solo consta que `expo-router` lo prueba con ese rango). No había `node_modules` (solo la caché de Yarn) ni backend corriendo.
