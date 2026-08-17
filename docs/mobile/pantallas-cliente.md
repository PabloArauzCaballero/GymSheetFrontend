# Pantallas del cliente (iOS/Android)

## Punto de partida

Las tres pantallas del grupo privado eran esqueletos: título, una frase muerta y
nada más. No consumían **ningún** endpoint. Auditoría en emulador Pixel_4
(Android 16) que motivó la reconstrucción:

| # | Defecto | Alcance |
| --- | --- | --- |
| 1 | Iconos de pestañas ausentes: se dibujaba el glifo «missing» (☒) | las 3 |
| 2 | Inicio: «Tu resumen de entrenamiento aparecerá aquí», 90 % de pantalla vacía | Inicio |
| 3 | Perfil: tres líneas de texto plano sin estructura | Perfil |
| 4 | Ajustes: entorno, versión y un botón | Ajustes |
| 5 | Sin scroll, sin pull-to-refresh, sin estados de carga/error/vacío | las 3 |
| 6 | Títulos pegados al status bar (sin inset superior) | las 3 |

> Nota: durante la auditoría se vieron fragmentos de la barra de pestañas
> dibujados sobre el status bar. **No es un defecto de la app**: no aparece en el
> volcado de `uiautomator` y desaparece al forzar un redibujado — es un artefacto
> del compositor del emulador.

## Kit de UI

Piezas reutilizables, todas alimentadas por `@gymsheet/design-tokens` (mismos
valores que la web, sin hex sueltos):

```
src/components/layout.tsx
  ScrollScreen    scroll + RefreshControl volt + inset superior + hueco sobre las pestañas
  ScreenHeader    título de página (+ subtítulo)
  Section         grupo etiquetado en mayúsculas
  Card            superficie con borde y acento lateral opcional
  Row             etiqueta izquierda / valor derecha
  StatTile        número grande + leyenda (fila de tres)
  Badge           estado con tono semántico (success/warning/danger/info)
  Divider         separador de grosor hairline

src/components/feedback.tsx
  Skeleton        bloque con la forma final: la pantalla no salta al cargar
  EmptyState      icono + título + explicación
  ErrorState      copia del motor de notificaciones (`resolveError`) + botón Reintentar
```

`ErrorState` **no inventa copia**: reutiliza `resolveError` de
`@gymsheet/notifications`, así un mismo fallo del backend se lee igual en un
toast, en un diálogo y en una pantalla.

## Datos

`src/api/services.ts` — sólo lecturas, validadas con los esquemas compartidos de
`@gymsheet/schemas` (mismos que valida la web, así un cambio de contrato falla en
ambos clientes a la vez):

| Pantalla | Endpoints |
| --- | --- |
| Inicio | `GET /me/membership`, `GET /workouts?page=1&pageSize=5`, `GET /routines/assignments/me` |
| Perfil | `GET /profile`, `GET /me/membership` |
| Ajustes | ninguno (estado local + `env`) |

Cada consulta usa TanStack Query con su propio ciclo: mientras carga muestra
`Skeleton`, si falla `ErrorState` con reintento, y si no hay datos `EmptyState`.
Un fallo aislado **no** tumba la pantalla: las demás secciones siguen visibles.

Excepción deliberada: en Perfil, un `404` de `GET /profile` significa «aún no
completó el onboarding», así que se trata como estado vacío y no se reintenta.

## Contenido por pantalla

- **Inicio** — saludo; membresía (plan, estado, vencimiento, días restantes);
  fila de estadísticas (sesiones totales, finalizadas, última relativa); rutina
  asignada activa con la nota del entrenador; y las últimas 5 sesiones con nº de
  ejercicios, duración y estado.
- **Perfil** — identidad (avatar con iniciales, nombre, correo, rol); datos
  físicos (peso, estatura, edad, objetivo, última actualización); membresía
  (plan, inicio, vencimiento, estado).
- **Ajustes** — Cuenta (correo, dónde vive la sesión) · Aplicación (versión,
  entorno) · cerrar sesión en variante `danger`, con confirmación.

## Detalles de plataforma

- **Pestañas**: iconos de `@expo/vector-icons` (Ionicons, ya incluido en Expo —
  sin dependencias nuevas), contorno en reposo y relleno al activarse.
- **Safe area**: `ScrollScreen` aplica el inset superior real y reserva el
  inferior más `2xl`, para que la última tarjeta no quede bajo las pestañas.
- **Pull-to-refresh** en Inicio y Perfil, con spinner volt (el indicador por
  defecto es invisible sobre negro).
- **Formato** (`src/lib/format.ts`): fechas en español; días relativos por
  calendario («Hoy», «Ayer», «Hace 3 días»), no por horas transcurridas; la
  duración se oculta cuando la sesión se cerró dentro del mismo minuto, porque
  «0 min» es ruido.

## Pasada de diseño (skill `ui-ux-pro-max`)

Se aplicaron las reglas de UI nativa de la skill. **No** se adoptó la paleta ni la
tipografía que proponía su generador de design-system: venía orientado a landing
web (naranja + Google Fonts) y la identidad negro/volt ya está fijada en
`@gymsheet/design-tokens` y compartida con la web. Sí se tomaron sus señales de
jerarquía (tipo grande para las cifras) y de motion (200-300 ms).

Cambios y por qué:

| Regla | Hueco encontrado | Corrección |
| --- | --- | --- |
| Tap feedback en todo lo pulsable | `Button` y los toasts no daban respuesta visual al pulsar | opacidad al presionar + `android_ripple`, sin mover el layout |
| Tamaños de icono como tokens | valores sueltos 18/22/28 | `iconSizes` en `@/theme` (16/20/24/32) |
| Duraciones de motion como tokens | 120/220 escritos a mano | `motion.instant/enter/exit` (salida más rápida que entrada) |
| Iconos decorativos fuera del árbol de accesibilidad | la mancuerna y los iconos de estado se leían en voz alta junto al texto que ya los explicaba | `accessibilityElementsHidden` + `importantForAccessibility` |
| Ritmo de 4/8 dp | `spacing.xs / 2` (= 2) rompía la escala | `spacing.xs` |
| Safe area también en horizontal | sólo se aplicaban insets arriba/abajo | `insets.left/right` en los gutters |
| Ancho de línea legible en pantallas grandes | texto de borde a borde en tablet | `maxContentWidth` (560): el ancho extra pasa a gutter |
| Jerarquía tipográfica | las cifras competían con los títulos | cifras a 32 px con `tabular-nums` y tracking ajustado: en una app de entrenamiento el número **es** el contenido |

### Verificado en dispositivo

- **Tamaño de texto del sistema al 130 %** (Dynamic Type). Destapó dos defectos
  reales, ya corregidos:
  1. El saludo imprimía el correo entero partido en dos líneas. Causa de fondo:
     `GET /auth/me` **no** devuelve `nombreCompleto` (sólo lo hace
     `POST /auth/login`), así que al rehidratar la sesión se pierde el nombre.
     `shortName()` cae ahora a la parte local del correo y el título se limita a
     dos líneas.
  2. Al hacer scroll, el contenido pasaba por debajo del status bar y chocaba con
     el reloj. `ScrollScreen` pinta una franja opaca de altura
     `max(insets.top, StatusBar.currentHeight)` — en Android el inset del
     safe-area se queda corto respecto a la barra realmente dibujada.
- **Sesión caducada durante el uso.** Con el token vencido (~15 min, no hay
  refresh) la app se quedaba **atascada**: las tres secciones mostraban una
  tarjeta «Sesión expirada» con un botón «Reintentar» que nunca podía funcionar,
  en vez de volver al login. `onUnauthorized` borraba los tokens pero nadie
  cambiaba el estado de la sesión, así que las guardas de ruta seguían creyendo
  que estaba activa. Ahora el cliente avisa al store vía
  `setSessionLostHandler`, el store pasa a `unauthenticated` y las guardas
  redirigen a `/login`. Además, TanStack Query ya no reintenta 401/403/404/422:
  repetir esas respuestas no puede cambiar el resultado.
- **Landscape**: no aplica, la app está bloqueada en vertical
  (`"orientation": "portrait"` en `app.json`).
- **Tablet**: los gutters adaptativos están implementados pero **no** verificados
  en un AVD de tablet.

## Paridad con la web (segunda fase)

La navegación se recompuso a **cinco pestañas** — el techo antes de que las
etiquetas se trunquen: Inicio · Rutinas · Ejercicios · Entrenos · Perfil.
Ajustes dejó de ser pestaña y se alcanza desde Perfil: se visita una vez y no
justifica un destino permanente.

| Pantalla | Contenido | Endpoints |
| --- | --- | --- |
| Ejercicios | catálogo de 1324 con búsqueda; detalle con imagen hero, pasos numerados, músculos y equipamiento | `GET /exercises`, `GET /exercises/{id}` |
| Rutinas | asignadas por el entrenador destacadas + todas; detalle con objetivo `3 × 8-12`, peso, descanso y RIR por ejercicio | `GET /routines?scope=mine`, `GET /routines/{id}`, `GET /routines/assignments/me` |
| Entrenos | historial completo; detalle con volumen total, series `80 kg × 8` y RIR, marca de énfasis | `GET /workouts`, `GET /workouts/{id}` |

### Imágenes de ejercicios

`ExerciseImage` resuelve el medio primario (`isPrimary`, si no el primero),
carga la miniatura en listas y la imagen completa en el detalle, hace fundido de
entrada (instantáneo con Reduce Motion), reserva el marco para no provocar salto
de layout y cae a un glifo si falla o no hay medio.

**Hoy no se ve ninguna imagen porque la base de datos no tiene**: consultado
`GET /exercises?pageSize=100`, los 100 ejercicios devuelven `media: []` (de 1324
en el catálogo). Es dato del backend, no de la UI — la web tiene el mismo vacío,
y por eso existen el gestor de medios y `POST /exercises/{id}/media`. En cuanto
se siembren medios, aparecerán sin tocar código.

A diferencia de la web, el móvil **no** proxya las imágenes: el proxy existe para
evitar SSRF desde el servidor, un riesgo que no aplica a un teléfono pidiendo una
URL externa.

### Diagnóstico de errores de programación

Un `ReferenceError` durante el login se registraba sólo como
`code: 'ReferenceError'`, sin mensaje ni stack — el motor lo trataba como un
fallo de API. `TelemetryEvent` gana `cause`: en desarrollo el sink imprime el
error tal cual cuando **no** es un `ApiError` (es decir, cuando es un bug
nuestro). Un sink de producción sigue enviando sólo los campos técnicos y nunca
`cause`, que puede contener datos del usuario.

## Pendiente

- La app es **de sólo lectura**: no se puede registrar una sesión desde el móvil
  (eso vive en la web). El siguiente paso natural es el flujo de entrenamiento en
  curso.
- Sin runner de pruebas en `apps/mobile` (`jest` no está instalado), así que
  estas pantallas se verificaron en emulador, no con pruebas automatizadas.
- Tema claro sin soportar: la app sigue anclada a `tones.dark`.
