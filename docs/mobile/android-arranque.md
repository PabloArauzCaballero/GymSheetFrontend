# Levantar la app en Android desde cero (Windows)

Todo lo necesario para dejar la aplicación corriendo en un emulador de Android
en otra máquina. Está escrito para Windows porque es donde se va a probar, pero
sólo cambian las rutas.

No hay carpeta `android/` en el repositorio, y es deliberado: la genera Expo a
partir de `app.json` con `expo run:android`. Versionarla obligaría a resolver a
mano cada conflicto de Gradle en cada cambio de configuración.

## 1 · Requisitos

| Pieza | Versión | Por qué esa |
| --- | --- | --- |
| Node | **22.x** | El repo declara `>=20 <24`. Con Node 24 los comandos de yarn se niegan a arrancar. |
| Yarn | 1.x | Es el gestor del monorepo; no mezclar con npm ni pnpm. |
| JDK | 17 | Es el que espera el Gradle de React Native 0.79. |
| Android Studio | Cualquiera reciente | Por el SDK y el gestor de emuladores, no por el editor. |
| SDK de Android | Platform 35 + Build-Tools | Los instala Android Studio en su primer arranque. |

Comprobar que `ANDROID_HOME` apunta al SDK y que `platform-tools` está en el
`PATH`; sin eso, `expo run:android` no encuentra `adb` y falla con un mensaje
que no menciona el `PATH`.

## 2 · Dependencias del monorepo

```powershell
cd GymSheetFrontend
yarn install --frozen-lockfile
```

Desde la raíz del monorepo, no desde `apps/mobile`: los paquetes compartidos se
resuelven por *workspaces*.

## 3 · Backend y base de datos

La aplicación no trae datos propios; habla con el backend. Con Docker:

```powershell
cd GymSheetBackend
docker start gymsheet-pg   # o el `docker run` de docs/mobile/ios-paridad.md
yarn build
node dist/main.js
```

Y los datos de demostración, sin los cuales la app se ve entera en estados
vacíos:

```powershell
yarn db:seed:all:development
node ..\GymSheetFrontend\apps\mobile\scripts\seed-demo-data.mjs
```

## 4 · La dirección del backend, que es donde falla todo

Copiar `apps/mobile/.env.example` a `apps/mobile/.env` y ajustar la URL:

- **Emulador de Android**: `http://10.0.2.2:3011/api/v1`. `10.0.2.2` es la
  dirección con la que el emulador ve a la máquina anfitriona; `localhost`
  dentro del emulador es el propio emulador, y la petición no sale de ahí.
- **Teléfono Android físico**: la IP de LAN del PC (`ipconfig`, IPv4 del
  adaptador activo), con el teléfono en la misma Wi-Fi.

Al cambiar de red esa IP caduca y la aplicación falla el acceso con un error de
red que parece un defecto suyo. Es el fallo más común de esta configuración.

## 5 · Arrancar

```powershell
cd apps\mobile
npx expo run:android
```

La primera vez genera la carpeta `android/`, descarga Gradle y compila: entre
diez y veinte minutos. Las siguientes son de segundos.

## 6 · Tráfico en claro

El backend local se sirve por `http://`, y Android bloquea el tráfico sin cifrar
desde API 28. Las compilaciones de depuración que genera Expo ya declaran
`usesCleartextTraffic`, así que en desarrollo funciona sin tocar nada. **Una
compilación de publicación contra un backend `http://` no conectará**, y el
error dirá «cleartext not permitted». La solución no es abrir el permiso: es
servir el backend por HTTPS.

## 7 · Pruebas automatizadas

Maestro sí soporta emuladores de Android, así que los flujos de `.maestro/`
valen tal cual:

```powershell
maestro test .maestro
```

Requiere el emulador arrancado, Metro corriendo y el backend accesible en la
dirección del punto 4.

## Qué mirar primero

`docs/mobile/android-paridad.md` recoge las diferencias de plataforma ya
corregidas y las que faltan por comprobar en un dispositivo, ordenadas por
riesgo. Empezar por el recorte del foco del tutorial: en iOS costó dos
iteraciones y sólo se detectó mirando la pantalla.
