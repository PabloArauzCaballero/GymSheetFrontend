# Reporte — Mapa muscular (figura anatómica interactiva)

Fecha de cierre: 2026-10-02. Rama: `feat/mapa-muscular` (frontend y backend).
Plan: [PLAN.md](./PLAN.md). Estado de cada unidad: HECHO salvo donde se indica.

## Qué se entrega

| Unidad | Estado | Evidencia |
|---|---|---|
| Figura anatómica fotorrealista, 4 láminas (frente/espalda × externa/profunda), 3072×6144 | HECHO | `assets/anatomy/*.webp`, 2,98 MB en total (presupuesto 8 MB) |
| 34 músculos tocables + `DELTOID` como agregado de sus 3 fascículos | HECHO | `regions.test.ts`: cada código resuelve exactamente en ≥ 1 vista |
| Toque → pantalla del músculo (cabecera recortada, descripción, ejercicios por rol, paginación) | HECHO | recorrido de los 35 músculos (abajo) |
| Lista accesible de todos los músculos (`/exercises/muscles`) | HECHO | `regions.test.ts` (35 en la lista, una vez cada uno) |
| Músculos del detalle de ejercicio tocables | HECHO, no probado en simulador | `type-check`; sin captura |
| Músculos sin ejercicios propios → ejercicios de un músculo relacionado, con aviso | HECHO | 11 pruebas de integración + recorrido |
| Crédito CC BY-SA 4.0 de Z-Anatomy en Ajustes | HECHO | `settings.tsx`; sin captura |
| Pipeline reproducible (`tools/anatomy`: descarga, render Blender, vectorizado) | HECHO | scripts versionados; los FBX no (`.cache/`) |

## Verificación ejecutada (salidas reales)

- Backend: `yarn lint` OK · `yarn type-check` OK · `yarn build` OK · `yarn test` → **96 suites, 717 pruebas, 0 fallos** (contra Postgres propio, migrado, sembrado y enriquecido).
- Frontend núcleo: `yarn turbo run source-check type-check lint test --filter=!@gymsheet/mobile` → **22/22 tareas**, web 263 pruebas.
- Móvil: `yarn type-check` OK · `yarn test:unit` → **90/90** (geometría de gestos, detección de toque, encuadre, y alcanzabilidad de los 34 músculos con las regiones reales).
- Recorrido en simulador (iPhone 17 Pro, iOS 26.5): para **cada uno de los 35 códigos**, abrir su pantalla y leer del árbol de React título, grupo·latín, recuento de ejercicios y contorno resaltado → **35/35**: 26 con ejercicios propios, 9 con aviso de músculo relacionado.
- Toque real sobre la figura (pecho, vista frontal) → «Pectoral mayor», 249 ejercicios. Capturas en `apps/mobile/ios-evidence/mapa-muscular/`.
- La prueba nueva `migrations.registry.spec.ts` **falla contra el código original** (lista `202609160002-profile-birth-date` como no registrada) y pasa con el arreglo.

## NO verificado (honestidad)

- **Maestro no está instalado**: `.maestro/07-mapa-muscular.yaml` está escrito y **sin ejecutar**; sus coordenadas en % son una estimación.
- **Pellizco y arrastre** de la figura: implementados y con la geometría probada, pero **no ejercitados en el simulador** (las herramientas de control del simulador dejaron de responder antes). Lo mismo con el botón «Zonas» y las vistas «Profunda» tocadas a mano tras el último ajuste.
- Las láminas finales a 3072×6144 se cargaron en la app pero **no las revisé visualmente** tras el último render (la herramienta de lectura de imágenes dejó de responder); sí lo hice con la versión de 2048×4096 y con el render de prueba.
- No se probó en Android (no hay AVD ni imágenes de sistema).
- Rendimiento (60 fps) y VoiceOver: no medidos.

## Decisiones tomadas (sustituyen a preguntas)

1. **Worktree aislado** `GymSheetFrontend-mapa`: el checkout principal del frontend tenía una migración a Expo SDK 57 sin commitear de otra sesión; no se tocó.
2. **Postgres propio** (puerto 5434) y backend en el 3012: la base compartida (5433) la usa otra sesión.
3. **`202609160002-profile-birth-date` registrada en `migrations/index.ts`**: estaba el archivo pero no el registro, así que la columna `fecha_nacimiento` no existía en ninguna base nueva y `db:seed:all:development` moría. Es un defecto de `origin/dev`.
4. **Regiones táctiles desde la máscara de identificadores renderizada**, no dibujadas a mano: el resaltado y la detección coinciden por construcción.
5. **Prioridad de máscara** para el recto abdominal (4 cm hacia la cámara solo en el pase de IDs): la aponeurosis del oblicuo externo lo tapaba y quedaba sin zona.
6. **Músculo de reserva** (`exerciseFallbackMuscle`): el dataset etiqueta «delts», «glutes»… no fascículos; sin esto, tocar el hombro llevaba a «Sin ejercicios». Solo actúa si el músculo no tiene ejercicios propios y la respuesta lo declara (`aproximado`).
7. **Sin doble toque para zoom**: obligaba a esperar ~250 ms en cada toque simple; el zoom va por pellizco y botones +/−.
8. **Plugin `with-pods-min-ios-target`**: Xcode 27 rechaza destinos de despliegue < 15.0 y varios pods declaran 9.0/11.0.

## Riesgos y deuda que quedan

- **Licencia CC BY-SA 4.0 (ShareAlike)**: las láminas son una obra derivada de Z-Anatomy y heredan esa licencia; el código de la app no. Conviene que alguien con criterio legal lo valide antes de publicar en tiendas. El crédito ya está en Ajustes.
- **`muscles.service.integration.spec.ts` necesita la base enriquecida** (`db:enrich:exercises`). El CI `hardening-ci` corre `yarn test` **antes** de migrar y no enriquece, así que (igual que `stories.repository.integration.spec.ts`) fallaría allí. Ese CI solo se dispara en `HARDENING` y PR a `main`, no al empujar a `dev`.
- **`db:enrich:exercises` no es idempotente** al re-ejecutarse (choca con la restricción única de `code`); se evitó vaciando las tablas en la base propia.
- **`hydrate()` de la app borra los tokens ante cualquier fallo de `/auth/me`**, incluida una red caída al arrancar: reiniciar el backend con la app abierta cierra la sesión. No se tocó.
- 9 músculos de la figura **no tienen ejercicios propios** en la base (ver `exerciseFallbackMuscle`); `PECTORALIS_MINOR` y otros dependen de ese aviso hasta que se mejore el etiquetado.
- El último despliegue «Deploy DEV to Coolify» del backend (`9959b06`, 29-sep) ya estaba en fallo antes de este trabajo.
