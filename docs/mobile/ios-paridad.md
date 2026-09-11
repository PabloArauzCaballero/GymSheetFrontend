# Paridad iOS

La app móvil siempre fue una sola base de código Expo para las dos plataformas,
pero sólo se había ejecutado en Android. Este documento recoge lo que hizo falta
para que **la misma app corra en iOS**, qué se cambió y con qué evidencia se
comprobó.

Regla que se siguió en todo el trabajo: **una sola implementación para las dos
plataformas**. No hay pantallas, componentes ni rutas específicas de iOS. Donde
iOS necesita algo que Android no, se resuelve con una rama de plataforma dentro
del mismo componente (y esa rama es inerte en Android), nunca duplicando la
pantalla.

## Entorno verificado

| | |
| --- | --- |
| Simulador | iPhone 17 Pro · iOS 26.5 (`7EE66102-3BB8-43C2-9294-E030054C1B5F`) |
| Xcode | 26.6 (17F113) |
| CocoaPods | 1.17.0 |
| Node | 22.23.2 — el repo declara `>=20 <24` y la máquina traía 24.18 |
| Expo SDK / React Native | 53 / 0.79.5, nueva arquitectura activada |
| Backend | NestJS local en `:3011`, PostgreSQL 16 en Docker |

`ios/` no se versiona: el proyecto usa Continuous Native Generation, así que se
regenera con `expo prebuild` a partir de `app.json`. Todo ajuste nativo vive en
la configuración o en un config plugin, nunca editado a mano dentro de `ios/`.

## Lo que impedía compilar (rutas con espacios)

Cuatro fases de build generadas invocan un script **sin comillar su ruta**. Da
igual en cualquier checkout normal; con el proyecto bajo «Mantra Core
Technologies» el shell parte la ruta por el espacio y busca un ejecutable
`…/Desktop/Mantra` que no existe. No es configuración de esta app: las plantillas
lo generan así, y por eso el arreglo vive en `plugins/with-path-spaces-fix.js` —
`ios/` lo regenera `expo prebuild` y una edición a mano allí la borra la
siguiente pasada.

| Fase | Dónde | Qué pasa |
| --- | --- | --- |
| `[CP-User] Generate Specs` | Pods | `sh -c "$A $B"` vuelve a partir la cadena |
| Bundle React Native code and images | app | sustitución por backticks sin comillar |
| Upload Debug Symbols to Sentry | app | ídem |
| `Generate app.config…` | Pods (expo-constants) | **no rompe el build: rompe la app** |

Las tres primeras fallan en voz alta. La cuarta es la mala:
`get-app-config-ios.sh` decide si le toca actuar con
`PROJECT_DIR_BASENAME=$(basename $PROJECT_DIR)` —sin comillas—, que con espacios
no devuelve «Pods», así que **sale con código 0**. La fase se da por buena,
`EXConstants.bundle` se queda sin su `app.config`, y el fallo aparece mucho
después y muy lejos: la app arranca y muere en rojo con «expo-linking needs
access to the expo-constants manifest», que no menciona ni rutas ni espacios.

Dos cosas que costaron una compilación cada una y están anotadas en el plugin:

- Comillar los argumentos de la fase de codegen **no basta**:
  `with-environment.sh` ejecuta lo que recibe como `$1`, sin comillas, en su
  última línea, y la ruta se vuelve a partir ya dentro de `node_modules`. Se le
  hace `source` y se invoca el script aquí.
- **El plugin tiene que ir el último de `app.json`**, después de
  `@sentry/react-native`: las dos fases de la app las escribe Sentry, los mods
  se aplican en el orden de la lista, y puesto antes el parche se aplicaba y
  Sentry lo sobrescribía a continuación. El prebuild terminaba «bien» y el
  proyecto salía sin parchear.

## Lo que impedía compilar

Dos cosas hacían fallar la compilación antes incluso de llegar a una pantalla.
Ninguna de las dos se manifestaba en Android.

### 1. Los PNG de `assets/` estaban corruptos

Los cuatro archivos eran marcadores de posición de 1×1 cuyo *chunk* `IDAT`
declaraba longitud 11 cuando contenía 13 bytes. Cualquier decodificador que
verifique CRC los rechaza, y `expo prebuild` usa uno (Jimp) para recortar el
juego de iconos de iOS:

```
✖ Prebuild failed
Error: [ios.dangerous]: withIosDangerousBaseMod: Crc error - 25226055 - -2146866552
```

Android nunca lo destapó porque su icono adaptativo lo compone el sistema en
tiempo de instalación a partir de una capa que puede fallar en silencio.

Se sustituyeron por arte real generado desde una sola fuente vectorial —
`scripts/generate-app-assets.sh`, que lee la identidad de `@gymsheet/design-tokens`
(negro `#000000` + volt `#c3f400`). Alimenta a **las dos** plataformas a
propósito: el icono es marca, no plataforma, y dejar que diverjan es como una app
acaba con dos marcas distintas en dos tiendas.

### 2. `fmt` 11.0.2 no compila con el clang de Xcode 26

React Native 0.79 fija `fmt` 11.0.2. El clang 21 de Apple exige que la llamada a
una función `consteval` sea ella misma una expresión constante, y el propio
`format-inl.h` de esa versión de fmt no cumple:

```
call to consteval function 'fmt::basic_format_string<char, unsigned int &>'
is not a constant expression   (ios/Pods/fmt/include/fmt/format-inl.h:1391)
```

`consteval` no existe antes de C++20, así que compilar **sólo ese pod** como
C++17 lleva la detección de fmt por la rama previa (`FMT_CPLUSPLUS < 201709L` →
`FMT_USE_CONSTEVAL 0`) y la comprobación en tiempo de compilación degrada a la
validación en tiempo de ejecución que fmt ya trae. Los otros 194 targets siguen
en C++20.

Vive en `plugins/with-fmt-consteval-fix.js` porque `ios/Podfile` es generado y
cualquier edición a mano la borra el siguiente `prebuild`. El parche se inserta
**después** de `react_native_post_install`: ese helper recorre todos los targets
y les estampa C++20, así que ponerlo antes no tiene efecto — cosa que costó un
ciclo de compilación descubrir.

Tiene fecha de caducidad: fmt lo arregló en 11.1 y React Native lo recoge desde
0.83.9 / Expo SDK 56. Al subir, se borra el plugin y su entrada en `app.json`.

## Defectos de iOS corregidos

### Los teclados numéricos no tenían salida

El más grave, y el único que puede dejar a alguien atascado en mitad de un
entreno. En iOS `number-pad` y `decimal-pad` **no traen tecla de retorno**, y a
diferencia de Android no hay botón atrás del sistema para cerrar el teclado. Los
campos numéricos de la app —peso/repeticiones/RIR entre series, las medidas
corporales del perfil, las series al construir una rutina— quedaban así: el
teclado se abre, tapa el botón de guardar, y nada en pantalla lo cierra.

Resulta que React Native ya construye la salida; la app simplemente no la
pedía. Cuando un teclado numérico se combina con un `returnKeyType` que
reconoce, `RCTTextInputComponentView` engancha un `UIToolbar` nativo con ese
botón y lo cablea para terminar la edición — es `setDefaultInputAccessoryView`,
en `React/Fabric/Mounting/ComponentViews/TextInput`. `inputAccessoryViewButtonLabel`
es lo que pone «Listo» en él en vez del texto por defecto en inglés.

`src/components/keyboard.tsx` se reduce entonces a un objeto,
`numericInputProps`, que se esparce sobre cada campo numérico. Uno solo, para
que un campo nuevo no pueda quedarse con la mitad del comportamiento. Las tres
propiedades son inertes en Android, que no necesita ninguna: allí el teclado
numérico se cierra con el botón atrás del sistema.

**Primero se intentó a mano** con un `InputAccessoryView` propio montado en la
raíz y direccionado por `nativeID`. Compilaba, tipaba y no aparecía nunca en el
simulador: en cuanto `inputAccessoryViewID` está puesto, el lado nativo se
aparta (`if (_backedTextInputView.inputAccessoryViewID) { … return; }`) y queda
esperando una vista que tiene que llegar por su cuenta. La barra del sistema es
además mejor resultado: se coloca, se dimensiona y se tematiza sola.

### El teclado tapaba los campos

Android redimensiona la ventana al abrirse el teclado (`adjustResize`); iOS no.
Un campo en la mitad inferior de un formulario con scroll quedaba detrás del
teclado, sin forma de alcanzarlo.

- `ScrollScreen` (todas las pantallas privadas) usa
  `automaticallyAdjustKeyboardInsets`, que añade la altura del teclado como
  inset de contenido, más `keyboardDismissMode="interactive"` y
  `keyboardShouldPersistTaps="handled"` para que un toque sobre un botón con el
  teclado abierto llegue al botón y no se lo trague el cierre del teclado.
- `Screen` (las pantallas de sesión) envuelve en `KeyboardAvoidingView` con
  `behavior="padding"` sólo en iOS. El formulario está centrado verticalmente,
  así que el teclado se abría justo encima de la contraseña y del botón. En
  Android se deja `behavior` sin definir a propósito: definirlo haría saltar el
  layout dos veces por un mismo teclado.

### El teclado salía claro sobre una app negra

`keyboardAppearance="dark"` en el `Input` compartido y en los campos numéricos.
En Android es inerte. Sin esto, la franja blanca del teclado era lo más brillante
de toda la app.

### El Llavero pedía guardar una contraseña que luego no sabía rellenar

Tras enviar un campo `secureTextEntry`, iOS ofrece guardar la credencial. Pero
sólo la rellena después si el campo declara qué contiene, y no lo hacía. Se
añadió `textContentType` (iOS) y `autoComplete` (Android) a los campos de correo
y contraseña.

### `NSFaceIDUsageDescription` en inglés

`expo-secure-store` inyecta el texto por defecto *«Allow GymSheet to access your
Face ID biometric data.»*, que es lo que vería el usuario en un diálogo del
sistema dentro de una app enteramente en español. Ahora se declara en
`app.json`.

### `ITSAppUsesNonExemptEncryption`

Sin esta clave, cada subida a TestFlight o App Store se detiene en la pregunta
manual de cumplimiento de exportación. La app sólo usa HTTPS, que está exento.

## Defectos compartidos que iOS destapó

### `DOMException` no existe en Hermes

`packages/api-client` reconocía el agotamiento de espera así:

```ts
if (error instanceof DOMException && error.name === 'AbortError') { … }
```

`DOMException` es un global del navegador que Hermes no define, así que el
`instanceof` lanzaba `ReferenceError` **desde dentro del propio `catch`** que
debía convertir el fallo en un `ApiError`. La pantalla que llamaba nunca recibía
un `ApiError`: en el simulador se veía un aviso rojo `Property 'DOMException'
doesn't exist` y un login que no avanzaba.

Al arreglar eso apareció la segunda mitad del problema. El polyfill de `fetch`
de React Native construye su propio rechazo de aborto con
`new DOMException('Aborted', 'AbortError')` — que en Hermes **también** lanza
`ReferenceError`. Es decir: al abortar una petición, React Native no rechaza con
nada llamado `AbortError`; rechaza con un `ReferenceError`. Comparar por `name`
tampoco servía.

La detección se hace ahora sobre **la señal propia del cliente**, que no depende
de lo que el runtime tenga a bien lanzar:

```ts
if (controller.signal.aborted) { /* 408, agotó el tiempo de espera */ }
```

Consecuencia práctica antes de la corrección: en móvil una petición que agotaba
los 15 s se reportaba como «Sin conexión con el servidor» —un fallo de red que
invita a revisar el wifi— en lugar de «La solicitud agotó el tiempo de espera».

Afecta a las dos plataformas —Hermes también corre en Android—, pero sólo se
manifiesta cuando una petición falla, que es lo que ocurrió aquí primero.

### `expo-file-system` no estaba declarado

`src/lib/export-progress.ts` lo importa directamente, pero sólo llegaba de forma
transitiva. Funcionaba por casualidad. Declarado en `package.json`.

### Accesibilidad: la barra de pestañas anunciaba nueve destinos, no cinco

Salió al inspeccionar la jerarquía para escribir los flujos. VoiceOver leía
«Inicio, pestaña, 1 de 9» sobre una barra con cinco pestañas alcanzables. Las
otras cuatro eran las pantallas declaradas con `href: null` en el navegador de
pestañas —Ajustes, Editar perfil, Membresía, Notificaciones—: ocultar una
pestaña le quita el botón, pero no la membresía.

Corregido moviéndolas a donde les correspondía desde el principio. `(app)` es
ahora un `Stack` cuya primera pantalla es el grupo `(tabs)`, y esas cuatro son
hermanas suyas en el stack. Las URL no cambian —los grupos no aparecen en la
ruta, así que `/settings` sigue siendo `/settings`—, ganan la transición de
empuje y el gesto de borde que ya tenían las demás pantallas de detalle, y la
barra cuenta hasta cinco. El guardia de sesión y el tour suben al stack para
cubrir también lo que se empuja encima.

No era específico de iOS: el mismo recuento lo haría TalkBack.

> **Al mover rutas, reinicia Metro con `--clear`.** Expo Router descubre las
> pantallas recorriendo `app/` con `require.context`, y Metro resuelve ese
> contexto contra su caché. Con la caché anterior el bundle seguía viendo el
> árbol viejo y la app arrancaba avisando `No route named "routines" exists in
> nested children: ["home", "profile"]`. No es un fallo del refactor —el código
> ya era correcto— pero cuesta un rato entenderlo porque la app compila, arranca
> y sólo falla al navegar.

El flujo `02-pestanas.yaml` lo comprueba con un `assertVisible: 'Inicio, tab, 1 of 5'`,
para que una regresión se vea en la prueba y no en el lector de pantalla.

## Huecos de Android, también corregidos

Los destapó `expo prebuild --platform android`. No son de iOS, pero eran
asimetrías reales entre las dos plataformas y se cerraron igual.

### El tema oscuro no se aplicaba en Android

`userInterfaceStyle: "dark"` sólo lo honraba iOS, donde el `Info.plist`
generado trae `UIUserInterfaceStyle = Dark`; Android lo ignoraba en silencio y
el prebuild lo avisaba («Install expo-system-ui in your project to enable this
feature»). Con `expo-system-ui` instalado, la declaración llega a las dos:
`android/app/src/main/res/values/strings.xml` pasa a incluir
`expo_system_ui_user_interface_style = dark`.

### `edgeToEdgeEnabled` sin declarar

A partir de Android 16 (`targetSdkVersion` 36) edge-to-edge deja de poder
desactivarse. Declararlo ahora (`android.edgeToEdgeEnabled: true`) hace que el
layout se verifique contra el comportamiento que la plataforma va a imponer, en
vez de descubrirlo en la actualización. El tema generado pasa a
`AppTheme parent="Theme.EdgeToEdge"`. Los insets ya estaban resueltos:
`ScrollScreen` aplica los cuatro (`top`, `bottom`, `left`, `right`) y `Screen`
usa `SafeAreaView`.

> **Verificado a nivel de configuración, no en ejecución.** Estos dos cambios se
> comprobaron regenerando el proyecto Android y leyendo lo que produce, pero no
> se ejecutaron en un emulador: esta máquina sólo tiene JDK 26 y el Gradle de
> React Native 0.79 exige JDK 17. Antes de publicar Android hay que pasarlos por
> el emulador, sobre todo el edge-to-edge, que es un cambio visual.

## Pasada de estética

Aplicando los principios de diseño nativo de Apple (`swiftui-design-principles`).
El diagnóstico se resume en dos frases del propio skill: *«restraint over
decoration»* y, sobre tipografía, *«large but visually light — elegant, not
heavy»*. La app fallaba exactamente en esas dos.

### El tipo grande iba en negrita, y por eso la página pesaba

El título de pantalla estaba a 40 px con peso **800**; las cifras de las
tarjetas de actividad, a 34 px con **800**; las etiquetas de sección, a **700**.
Al tamaño de display el peso ya no aporta jerarquía —la aporta el salto de
tamaño—; lo que añade es densidad. La letra se cierra sobre sí misma y la página
se lee cargada.

Todo eso baja a **600**. Es el cambio con más efecto de los tres: un display
grande y ligero es lo que separa un titular compuesto de texto grande en
negrita.

### Los botones eran tres capas para pintar un rectángulo

Cada botón lleno era un degradado de dos paradas **más** un velo blanco animado
al pulsar. Y el degradado iba de un volt más claro que la marca a uno más
apagado, así que **el color del botón principal no era el color de la marca en
ningún punto de su cara**.

Ahora es un relleno plano en el volt exacto. La respuesta al toque la sigue
dando la escala y el tic háptico, que son físicos; el destello era decorado.

### Las tarjetas declaraban sombras que no dibujaban nada

`Card` traía cuatro propiedades de sombra negra sobre un fondo negro — el propio
comentario admitía que «shadows do nothing on black» y aun así las declaraba— y
un `borderTopColor` más claro para simular una arista iluminada, truco que sólo
conseguía que un lado del marco no coincidiera con los otros tres. Fuera ambas:
en un tema oscuro la separación la da la luminancia de la superficie, y el borde
es de un solo tono.

### Lo que **no** se tocó, y por qué

- **La identidad negro/volt y el fondo ambiental.** Son decisiones deliberadas y
  documentadas, no ruido accidental. Limpiar no es despersonalizar.
- **La escala tipográfica.** Quedan siete tamaños (12/14/16/20/26/34/40) y el
  skill recomienda cinco o menos. Consolidarla toca casi todas las pantallas y
  merece su propia pasada con su propia verificación, no colarla en ésta.

## Pruebas en el simulador

Los flujos son de **Maestro**, que es la herramienta que `docs/mobile/estrategia-pruebas.md`
ya recomendaba para E2E móvil. Maneja el simulador vía XCUITest, sin permisos de
accesibilidad ni coordenadas a ojo, y los mismos ficheros sirven para un emulador
Android cambiando el `appId`.

```
.maestro/
  login.subflow.yaml        login reutilizable
  01-sesion.yaml            arranque en frío + login
  02-pestanas.yaml          las cinco pestañas con datos reales
  03-teclado-numerico.yaml  la barra «Listo» (la corrección sólo de iOS)
  04-ajustes-y-cierre.yaml  ajustes + diálogo de confirmación
```

Cada flujo se abre paso solo con `runFlow: login.subflow.yaml` en vez de heredar
la sesión del anterior: encadenarlos hace que un fallo en el primero se lea como
cuatro fallos y esconde cuál se rompió de verdad.

Dos cosas de iOS que condicionan cómo están escritos los flujos:

- **`Modal` vive en otra ventana.** React Native presenta `Modal` en una
  `UIWindow` propia, así que mientras el tour de bienvenida o el diálogo de
  confirmación están encima, **nada de lo que hay detrás aparece en la jerarquía
  de accesibilidad** que consulta XCUITest. Esperar «Hola, Athlete» con el tour
  abierto falla aunque se lea perfectamente en la captura. Por eso los flujos
  esperan primero al modal, lo cierran, y sólo entonces comprueban la pantalla.
  (De cara a accesibilidad el comportamiento es el correcto: lo que queda bajo
  un modal no debe ser alcanzable por VoiceOver.)
- **La alerta del Llavero llega tarde.** Aparece cuando el sistema decide, no
  cuando se pulsa el botón, así que el paso que la descarta es opcional.
- **Se selecciona por `accessibilityLabel`, no por el texto que se ve.** Cuando
  un componente declara una etiqueta, ésta *sustituye* al texto de sus hijos en
  el árbol de accesibilidad, y es contra ella contra la que compara Maestro —
  además, la comparación es una expresión regular **completa**, no una
  subcadena. De ahí que:
  - el botón del tour sea `Saltar tutorial` y no `Saltar`;
  - las filas de `NavRow` sean `Ajustes. Cuenta, versión y cierre de sesión`;
  - las pestañas sean `Rutinas, tab, 2 of 9`, por lo que hay que escribir
    `Rutinas, tab.*`.

  No es un defecto: las etiquetas están bien puestas y son lo que oye alguien
  con VoiceOver. Pero es lo primero contra lo que se choca al automatizar, y
  vale la pena mirar la jerarquía (`maestro hierarchy`) antes de escribir un
  selector.
- **`clearState` no vacía el Llavero.** Vacía el contenedor de la app, pero
  `expo-secure-store` escribe en el Keychain de iOS, que vive fuera. Ahí están
  la sesión y el flag de «tour ya visto», así que el flujo que se creía de
  instalación nueva arrancaba ya autenticado y sin tour — y esperaba una
  pantalla de login que nunca iba a llegar. Desinstalar tampoco basta en el
  simulador, porque el Llavero es del dispositivo y no del paquete. Lo que sí
  funciona es `clearKeychain: true` junto a `clearState` en el `launchApp` del
  flujo 01. Es específico de iOS: en Android el equivalente se va con los datos
  de la app.
- **El arranque en frío no es gratis en desarrollo.** `clearState` borra también
  el bundle de JavaScript que la app guarda en su contenedor, así que el
  siguiente arranque lo vuelve a descargar de Metro. Sólo el flujo 01 lo usa,
  que es donde la instalación limpia forma parte de lo que se está probando; los
  demás reutilizan la sesión y se adaptan a lo que encuentran.

### Levantar el entorno desde cero

Siete pasos, en este orden. Todo asume Node 22 en el PATH
(`export PATH="/opt/homebrew/opt/node@22/bin:$PATH"`), porque el repo declara
`>=20 <24` y la máquina trae 24 por defecto.

```bash
# 0 · Comprobar que la IP de LAN del `.env` sigue siendo la del Mac.
#     Al cambiar de red caduca, y la app falla el login con un error de red
#     que parece un defecto suyo. Ver ios-evidencia.md.
for i in en0 en1 en2 en3 en4 en5; do ipconfig getifaddr $i; done
grep EXPO_PUBLIC_API_URL GymSheetFrontend/apps/mobile/.env

# 1 · PostgreSQL
docker start gymsheet-pg           # o, la primera vez:
# docker run -d --name gymsheet-pg -e POSTGRES_DB=gym_sheet \
#   -e POSTGRES_USER=gym_sheet_writer -e POSTGRES_PASSWORD=local_dev_password_2026 \
#   -p 5433:5432 postgres:16-alpine

# 2 · Backend (rama fix/membership-seed-and-lock, ver abajo)
cd GymSheetBackend && yarn build && node dist/main.js

# 3 · Datos: usuarios primero, contenido después
yarn db:seed:all:development
node ../GymSheetFrontend/apps/mobile/scripts/seed-demo-data.mjs

# 4 · Metro
cd ../GymSheetFrontend/apps/mobile && npx expo start --port 8081
#    Tras mover ficheros dentro de `app/`, añade --clear.

# 5 · Simulador con la app instalada
npx expo run:ios --device "iPhone 17 Pro"

# 6 · Flujos + capturas
./scripts/run-ios-evidence.sh
```

Conviene lanzarlo con la máquina descargada: por encima de `load average` 25 la
primera petición al backend supera los 15 s que espera el cliente API, la app se
rinde sola y los flujos empiezan a gastar reintentos en algo que no es un
defecto suyo.

Las capturas quedan en `apps/mobile/ios-evidence/`. El runner las extrae del
directorio de artefactos de Maestro, que es donde `takeScreenshot` las escribe
realmente; por eso los flujos nombran las capturas con un `NN-slug` sin ruta
(Maestro rechaza cualquier ruta que se salga de su propia carpeta de salida).

### Backend para las pruebas

`docs/mobile/estrategia-pruebas.md` y `CLAUDE.md` son explícitos: no se afirma
E2E sin backend y PostgreSQL activos. Los flujos corren contra el backend real.

### Datos, no sólo usuarios

`yarn db:seed:all:development` crea **usuarios y nada más**. Con eso la app
carga, pero se ve entera en estados vacíos —«Sin membresía activa», «Sin rutina
asignada», catálogo sin ejercicios—, que prueba que las pantallas responden
pero no enseña la interfaz que la gente usa de verdad.

`apps/mobile/scripts/seed-demo-data.mjs` cubre ese hueco: da de alta una sede,
un plan «Pro Mensual», una membresía activa que empezó hace diez días (para que
haya vencimiento y días restantes reales), ocho ejercicios de catálogo, una
rutina del entrenador asignada al atleta con su prescripción y su nota, una
rutina propia programada en la semana, tres sesiones finalizadas con sus series
y el perfil físico.

Todo se crea **por la API**, con los roles y las validaciones de producción —
admin para sede/plan/membresía/catálogo, coach para la rutina asignada, el
propio atleta para lo suyo—; nada se escribe a mano en PostgreSQL.

```bash
node apps/mobile/scripts/seed-demo-data.mjs
```

### Otras dos cosas que conviene saber al reproducirlo

- La rama `main` del backend **no** sirve los endpoints que la app consume
  (`/me/membership`, `/routines/assignments/me`): responde 404 y las pantallas
  muestran su `ErrorState`. La rama que sí los tiene es
  `fix/membership-seed-and-lock`, que es la que corresponde al `dev` del
  frontend.
- El simulador de iOS comparte la red del anfitrión, así que
  `EXPO_PUBLIC_API_URL=http://localhost:3011/api/v1` funciona tal cual — sin el
  `10.0.2.2` que necesita el emulador de Android. El `Info.plist` generado trae
  `NSAllowsLocalNetworking`, que es lo que permite ese HTTP en claro; un host de
  LAN o de staging por HTTP sí necesitaría su propia excepción ATS.

## Evidencia

Ver [`ios-evidencia.md`](./ios-evidencia.md).
