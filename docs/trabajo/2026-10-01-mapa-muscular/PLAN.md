# Plan — Mapa muscular ultra realista en GymSheet (móvil)

## Contexto

Quieres una figura del cuerpo humano ultra realista y en alta definición en la app móvil. Al tocar un músculo, la app lleva directamente a la pantalla de ese músculo. Hoy:

- **El backend ya tiene la taxonomía.** Son 10 grupos y 36 músculos con nombre en español y en latín, y las 1.324 rutinas de ejercicio están mapeadas a músculos. También existe el endpoint `GET /muscles/:code/exercises` (`GymSheetBackend/src/modules/exercises/muscles/`).
- **La app móvil no usa esa taxonomía.** El catálogo (`apps/mobile/app/(app)/(tabs)/exercises/index.tsx`) navega con textos del dataset en inglés. No hay SVG, Skia ni 3D instalados, ni ningún recurso de anatomía.
- **Los repos están desactualizados.** El backend va 27 commits detrás de `origin/dev`. El frontend va 25 commits detrás y tiene 20 cambios locales sin commitear (limpieza de lint, 10 archivos solapan con lo que viene).
- **Emulador.** Solo iOS es viable: Xcode 27, iOS 26.5, iPhone 17 Pro apagado. Android no tiene AVD ni imágenes de sistema.

**Decisión tomada contigo:** la figura sale del modelo anatómico libre **Z-Anatomy (CC BY-SA 4.0)**, renderizada con Blender. La licencia obliga a mostrar el crédito en la app.

Resultado buscado: una figura fotorrealista de frente y espalda, con capa superficial y profunda, en 4K. Tiene zoom, giro y resaltado, y los 35 músculos entrenables son tocables. Cada toque abre una pantalla de músculo con su descripción y sus ejercicios (principales, secundarios y estabilizadores).

---

## Fase 0 — Traer la última versión

Toda la sesión usa `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"`.

1. **Backend:** `git fetch origin && git merge --ff-only origin/dev`, luego `yarn install --frozen-lockfile`.
2. **Frontend:**
   1. `git stash push -u -m "limpieza-lint-local-previa"`, luego `git merge --ff-only origin/dev`, luego `git stash pop`.
   2. Si hay conflictos en los 10 archivos solapados, gana la versión de upstream y reaplico encima solo la limpieza de lint que siga teniendo sentido.
   3. **No borro el stash** hasta comprobar que nada se pierde (queda de respaldo).
   4. `yarn install`.
3. **AlovidaPromptManager:** ya está al día, no se toca.
4. **Rama de trabajo** `feat/mapa-muscular` desde `dev`, en ambos repos. Solo commits locales: **no hago `git push`**.
5. **Línea base verde antes de tocar nada:** `yarn mobile type-check` y `yarn verify` en el frontend; `yarn lint`, `yarn type-check` y `yarn test` en el backend. Lo que ya falle antes de mis cambios queda anotado como preexistente.
6. **Registro según la norma de la empresa:** `docs/trabajo/2026-10-01-mapa-muscular/PLAN.md` (copia de este plan) en el frontend, y `REPORTE.md` al cerrar.

## Fase 1 — Pipeline de recursos (offline y reproducible)

Las descargas están aprobadas con este plan:

| Recurso | Origen | Tamaño aprox. |
|---|---|---|
| Blender | `brew install --cask blender` | ~700 MB |
| Z-Anatomy (`.blend` de músculos) | repo oficial `LluisV/Z-Anatomy` en GitHub | ~1 GB |
| `opencv-python-headless` y `numpy` | pip, en un venv del scratchpad | ~60 MB |

Antes de usar Z-Anatomy verifico la licencia en su repo. Si no estuviera disponible, el respaldo es BodyParts3D (CC BY-SA 2.1 JP), que es la base de Z-Anatomy.

Los scripts quedan versionados en `GymSheetFrontend/apps/mobile/tools/anatomy/`, para que cualquiera pueda regenerar los recursos:

1. **`muscle-map.json` (tabla de correspondencia).** Asocia cada código de la taxonomía (`PECTORALIS_MAJOR`, `DELTOID_ANTERIOR`, …) con los objetos de Z-Anatomy (izquierda y derecha, varias cabezas) y con su vista y capa:
   - **Capa superficial, frente:** pectoral mayor, deltoides anterior y lateral, bíceps, braquiorradial, flexores del antebrazo, recto abdominal, oblicuos, serrato anterior, cuádriceps, aductores, abductores (TFL), tibial anterior, esternocleidomastoideo, trapecio superior, gemelos.
   - **Capa superficial, espalda:** trapecio, deltoides posterior, infraespinoso, redondo mayor, dorsal ancho, erectores, tríceps, extensores del antebrazo, glúteo mayor y medio, isquiotibiales, gemelos, sóleo.
   - **Capa profunda:** pectoral menor, transverso abdominal, flexores de cadera, braquial, manguito rotador, elevador de la escápula, romboides, sóleo completo.
   - `CARDIOVASCULAR` no es un músculo: va como acceso aparte en la pantalla.
   - Un test comprueba que los 35 códigos (36 de la taxonomía menos `CARDIOVASCULAR`) aparecen al menos en una vista o capa.
2. **`render.py` (Blender sin interfaz, motor Cycles).** Hace dos pasadas por vista y capa: frente y espalda, superficial y profunda.
   - **Beauty:** render 2048×4096 con materiales de músculo realistas (subsurface, normal maps, fibras), iluminación de estudio de tres puntos y fondo transparente. Se exporta a WebP o JPEG de alta calidad.
   - **ID-mask:** cada músculo se pinta de un color plano único, sin antialiasing, para sacar sus regiones exactas.
3. **`trace.py` (OpenCV).** Recorre la ID-mask, extrae los contornos de cada músculo, los suaviza y los convierte en paths SVG en coordenadas normalizadas.
   - Genera `src/features/body-map/regions.generated.ts` con `{ code, view, layer, paths[] }`.
   - Esos mismos paths sirven para detectar el toque y para el resaltado, así ambos coinciden siempre con la imagen.
4. **Destino de los recursos:** `apps/mobile/assets/anatomy/` (front/back × superficial/profunda, @3x). Presupuesto total ≤ 8 MB, que verifico con un script.

## Fase 2 — Dependencias y compilación nativa

- `npx expo install react-native-svg`. Ya están `react-native-reanimated`, `gesture-handler`, `expo-image` y `expo-haptics`.
- Rebuild nativo: `npx expo run:ios --device "iPhone 17 Pro"`.
  - `plugins/with-path-spaces-fix.js` debe seguir el último en `app.json`.
  - Me fijo en el aviso de que el build se verificó con Xcode 26.6 y aquí hay 27.0.

## Fase 3 — Backend (cambio mínimo)

- `GET /muscles/:code`: detalle de un músculo con nombre, latín, descripción y grupo. Si ya existe algo equivalente en `muscles.service.ts`, lo reutilizo.
- Extender la consulta de `GET /muscles/:code/exercises` (`muscles.service.ts:121-149`) para que devuelva `imageUrl` de cada ejercicio y acepte `offset`, para paginar.
- Mappers y validación con Zod según `CLAUDE.md`. Specs en Jest siguiendo `muscle-taxonomy.spec.ts`, más la prueba de integración con Postgres.

## Fase 4 — Frontend móvil

### Datos (`packages/`)

- Esquemas Zod `muscleDetailSchema` y `muscleExercisesSchema` en `packages/schemas/src/definitions/progression.ts`, junto a `muscleCatalogEntrySchema`.
- `muscleService` en `apps/mobile/src/api/services.ts`, junto a `exerciseService`, con React Query.

### Componente `BodyMap` (`apps/mobile/src/features/body-map/`)

- **Base:** imagen 4K con `expo-image`, más una capa `react-native-svg` con los paths generados, alineada píxel a píxel con un `viewBox` común.
- **Gestos** (`gesture-handler` y Reanimated):
  - pellizcar para zoom 1×–4×;
  - arrastrar para moverse con zoom;
  - doble toque para acercar;
  - tocar un músculo para entrar.
- **Al tocar:** resaltado del músculo con el acento del tenant (`colors.volt`), pulso suave, háptica `selection` y una etiqueta flotante con el nombre. Tras unos 250 ms navega a su pantalla. Si `useReducedMotion` está activo, va directo sin animación.
- **Controles:**
  - Frente/Espalda, con giro animado.
  - Superficial/Profunda.
  - Botón «Ver todos los músculos», una lista accesible con la misma navegación.
- **Accesibilidad:** cada región es un elemento con `accessibilityRole="button"` y el nombre en español. Las áreas táctiles mínimas de los músculos pequeños se agrandan sin tapar a los vecinos.
- **Lógica pura** (detección de toque, mapeo y estado de vistas) en `.ts` separado, probada con `node:test` como `story-viewers-presentation.test.ts`.

### Pantallas

1. **Pestaña Ejercicios, nivel 1** (`exercises/index.tsx`, bloque de la línea 198): la figura sustituye a la cuadrícula de zonas. La cuadrícula sigue debajo como alternativa y el botón «Crear un ejercicio propio» se mantiene.
2. **Pantalla nueva `exercises/muscle/[code].tsx`:**
   - cabecera con la figura recortada al músculo resaltado;
   - nombre en español y en latín, grupo y descripción;
   - ejercicios en secciones (Principal, Secundario, Estabilizador) con miniatura, que abren `exercises/[id]`.
   - Patrón de estados (carga, error, vacío) igual que `exercises/[id].tsx`, con `Skeleton`, `ErrorState` y `EmptyState`.
3. **Enlaces de vuelta:** en el detalle del ejercicio (`[id].tsx:~96-110`), los músculos pasan a ser tocables usando `GET /exercises/:id/muscles`.
4. **Créditos:** en Ajustes, «Anatomía: Z-Anatomy, CC BY-SA 4.0», como exige la licencia.

El diseño pasa por las skills obligatorias del repo (`apple-premium-ui` y `motion-design`, según `GymSheetFrontend/CLAUDE.md`) antes de escribir la UI, y por `web-design-guidelines` al cerrar.

## Fase 5 — Emulador y bucle de calidad (`/loop`)

### Arranque

1. Docker y Postgres:
   - `docker compose up -d postgres` o `gymsheet-pg` (puerto 5433);
   - `yarn migration:up`;
   - `yarn db:seed:all:development`;
   - `yarn db:enrich:exercises`;
   - `seed-demo-data.mjs`.
2. Backend en el puerto 3011, Metro y la app en el iPhone 17 Pro.
3. Entro con `athlete.mock@gymsheet.local` y la contraseña de la siembra, que no se repite en el chat.

### Bucle

Con `/loop` en modo autorregulado, cada iteración:

1. Captura con `xcrun simctl io booted screenshot` o con la herramienta del simulador de: la pestaña Ejercicios, frente, espalda, capa profunda, zoom 3× en hombro y antebrazo, toque en músculo, la pantalla del músculo y la lista accesible.
2. Hace dos revisiones de cada captura, la segunda adversarial (norma de la empresa), contra esta rúbrica:
   - **Realismo:** sin bandas, aliasing ni artefactos de render; con zoom 3× la textura sigue nítida.
   - **Precisión:** la silueta resaltada coincide exactamente con el músculo de la imagen.
   - **Toque:** 35 de 35 músculos navegan al código correcto. Lo pruebo con un flujo de Maestro, o con taps automáticos por coordenadas si Maestro no está instalado.
   - **Diseño:** UI premium oscura, tipografía y espaciado coherentes con el tema, sin solapes ni texto cortado.
   - **Rendimiento:** pantalla visible en menos de 1 s y gestos a 60 fps sin tirones.
   - **Accesibilidad:** VoiceOver lee cada músculo y se respeta el movimiento reducido.
3. Corrige lo peor, recompila y vuelve a capturar.

**Fin del bucle:** dos iteraciones seguidas con la rúbrica entera en verde, o un tope de 12 iteraciones. Lo que quede pendiente se documenta.

## Verificación final (con evidencia pegada en `REPORTE.md`)

- **Frontend:** `yarn mobile type-check`, `yarn verify`, los tests `node:test` del mapa y el test de cobertura 35/35 de `muscle-map.json`.
- **Backend:** `yarn lint`, `yarn type-check`, `yarn test` y la prueba de integración del endpoint con Postgres real.
- **E2E:** flujo de Maestro `07-mapa-muscular.yaml`: login, Ejercicios, tocar el pectoral, comprobar el título «Pectoral mayor», volver, girar, tocar el dorsal ancho, comprobar.
- **Galería de capturas finales** en `apps/mobile/ios-evidence/mapa-muscular/`, enviada al chat.
- **Cierre:** commits locales en `feat/mapa-muscular` en los dos repos. El `push` y la PR quedan para cuando lo pidas.

## Riesgos y respaldos

| Riesgo | Respaldo |
|---|---|
| Docker Desktop se cae a mitad de sesión | `open -a Docker` y volver a levantar Postgres. |
| El build falla en Xcode 27 | Leer el log y aplicar los parches documentados en `docs/mobile/ios-paridad.md`. |
| Cycles es lento en esta Mac | Bajar las muestras y aplicar denoise antes de reducir la resolución. |
| Z-Anatomy separa algún músculo de forma distinta a la taxonomía | Agrupar varios objetos bajo un mismo código en `muscle-map.json`. |
