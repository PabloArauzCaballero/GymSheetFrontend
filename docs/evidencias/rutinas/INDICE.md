# Evidencia — Rutinas REPP (F2 · RF-03 a RF-08)

Generado por `scripts/evidencia/generar-indice-rutinas.mjs` a partir de lo que existe en disco. Un archivo que falta sale como **falta**; un paso que no se pudo capturar lleva su motivo. Una captura cuenta como **revisada** sólo si está en `revisiones.json` con lo que se observó.

Web: 390 y 1440 px × tema claro y oscuro (4 capturas por paso). Móvil: iOS Simulator (iPhone 17 Pro), sólo tema oscuro: la app móvil no tiene tema claro.

## Resumen por requisito

| RF | Web (capturas) | Móvil (capturas) | Pasos sin captura |
|---|---|---|---|
| RF-03 | 20 / 20 | 5 / 5 | 2 |
| RF-04 | 12 / 12 | 3 / 3 | 0 |
| RF-05 | 12 / 12 | 6 / 6 | 0 |
| RF-06 | 32 / 32 | 7 / 7 | 1 |
| RF-07 | 20 / 20 | 4 / 4 | 1 |
| RF-08 | 16 / 16 | 4 / 4 | 0 |

## Detalle

| RF | Paso | Plataforma | Archivo | Qué debe verse | Estado |
|---|---|---|---|---|---|
| RF-03 | 01 | Web | `RF-03/web/RF-03_p01_paso1-vacio_*` | «Paso 1 de 6 · Nombre», campo vacío, barra de progreso con el primer segmento activo. | ✅ 4/4 capturadas · sin revisar |
| RF-03 | 01 | Móvil | `RF-03/movil/RF-03_p01_paso1-vacio_*` | «Paso 1 de 6 · Nombre», campo vacío, barra de progreso con el primer segmento activo. | ✅ 1/1 capturadas · sin revisar |
| RF-03 | 02 | Web | `RF-03/web/RF-03_p02_paso1-error-nombre_*` | Siguiente sin nombre: «Escribe un nombre» bajo el campo y sigue en el paso 1. | ✅ 4/4 capturadas · sin revisar |
| RF-03 | 02 | Móvil | `RF-03/movil/RF-03_p02_paso1-error-nombre_*` | Siguiente sin nombre: «Escribe un nombre» bajo el campo y sigue en el paso 1. | ✅ 1/1 capturadas · sin revisar |
| RF-03 | 03 | Web | `RF-03/web/RF-03_p03_paso2_*` | «Paso 2 de 6 · Descripción». | ✅ 4/4 capturadas · sin revisar |
| RF-03 | 03 | Móvil | `RF-03/movil/RF-03_p03_paso2_*` | «Paso 2 de 6 · Descripción». | ✅ 1/1 capturadas · sin revisar |
| RF-03 | 04 | Web | `RF-03/web/RF-03_p04_volver-conserva_*` | Volver al paso 1: el nombre escrito sigue ahí. | ✅ 4/4 capturadas · sin revisar |
| RF-03 | 04 | Móvil | `RF-03/movil/RF-03_p04_volver-conserva_*` | Volver al paso 1: el nombre escrito sigue ahí. | ✅ 1/1 capturadas · sin revisar |
| RF-03 | 05 | — | — | retomar-borrador | ❌ NO cubierto con captura. Reabrir la app para ver «Tienes un borrador sin terminar» no está automatizado (ni Maestro ni Playwright lo recorren); sólo hay pruebas de lógica en Vitest (routine-draft.test.ts y draft-store.test.ts: persistir, recuperar, descartar contenido corrupto). |
| RF-03 | 06 | — | — | salir-sin-guardar | ❌ NO cubierto con captura. La confirmación «¿Salir sin guardar?» es una alerta nativa de iOS (móvil) y el aviso del navegador `beforeunload` (web); ninguno sale en una captura de página y no se probó visualmente. |
| RF-03 | 07 | Web | `RF-03/web/RF-03_p07_rutina-guardada_*` | Tras Guardar se abre el detalle de la rutina recién creada, con su nombre. | ✅ 4/4 capturadas · sin revisar |
| RF-03 | 07 | Móvil | `RF-03/movil/RF-03_p07_rutina-guardada_*` | Tras Guardar se abre el detalle de la rutina recién creada, con su nombre. | ✅ 1/1 capturadas · sin revisar |
| RF-04 | 01 | Web | `RF-04/web/RF-04_p01_resumen-4-dias-12-semanas_*` | Lunes, miércoles, jueves y viernes marcados y el resumen «4 días · 12 semanas». | ✅ 4/4 capturadas · sin revisar |
| RF-04 | 01 | Móvil | `RF-04/movil/RF-04_p01_resumen-4-dias-12-semanas_*` | Lunes, miércoles, jueves y viernes marcados y el resumen «4 días · 12 semanas». | ✅ 1/1 capturadas · sin revisar |
| RF-04 | 02 | Web | `RF-04/web/RF-04_p02_sin-dias_*` | Sin días: «Elige al menos un día» y Siguiente desactivado. | ✅ 4/4 capturadas · sin revisar |
| RF-04 | 02 | Móvil | `RF-04/movil/RF-04_p02_sin-dias_*` | Sin días: «Elige al menos un día» y Siguiente desactivado. | ✅ 1/1 capturadas · sin revisar |
| RF-04 | 03 | Web | `RF-04/web/RF-04_p03_descarga-cada-5_*` | Progresión con descarga cada 5 semanas: «12 semanas · descarga cada 5». | ✅ 4/4 capturadas · sin revisar |
| RF-04 | 03 | Móvil | `RF-04/movil/RF-04_p03_descarga-cada-5_*` | Progresión con descarga cada 5 semanas: «12 semanas · descarga cada 5». | ✅ 1/1 capturadas · sin revisar |
| RF-05 | 01 | Móvil | `RF-05/movil/RF-05_p01_toque-simple-abre-dia_*` | Toque simple en Lunes: abre la pantalla de ejercicios del lunes. | ✅ 1/1 capturadas · sin revisar |
| RF-05 | 02 | Móvil | `RF-05/movil/RF-05_p02_toque-sostenido-selecciona_*` | Toque sostenido en Lunes: modo selección con Lunes marcado («1 día seleccionado»). | ✅ 1/1 capturadas · sin revisar |
| RF-05 | 03 | Móvil | `RF-05/movil/RF-05_p03_dos-dias-seleccionados_*` | Un toque en Jueves lo añade: «2 días seleccionados». | ✅ 1/1 capturadas · 1 revisadas |
| RF-05 | 04a | Móvil | `RF-05/movil/RF-05_p04a_configurar-juntos-3-ejercicios_*` | Pantalla «Configurar juntos» (Lunes y jueves) con los 3 ejercicios elegidos antes de pulsar Listo. | ✅ 1/1 capturadas · sin revisar |
| RF-05 | 04 | Móvil | `RF-05/movil/RF-05_p04_lunes-y-jueves-con-3_*` | Configurar juntos con 3 ejercicios y Listo: Lunes y Jueves con «3 ejercicios». | ✅ 1/1 capturadas · 1 revisadas |
| RF-05 | 05 | Móvil | `RF-05/movil/RF-05_p05_boton-seleccionar_*` | El botón «Seleccionar» entra al mismo modo de selección (alternativa accesible). | ✅ 1/1 capturadas · sin revisar |
| RF-05 | 01 | Web | `RF-05/web/RF-05_p01_casillas-lunes-jueves_*` | Casillas marcadas en Lunes y Jueves y la barra «Configurar seleccionados». | ✅ 4/4 capturadas · sin revisar |
| RF-05 | 02 | Web | `RF-05/web/RF-05_p02_lunes-jueves-con-3_*` | Tras configurar juntos con 3 ejercicios, ambos días con «3 ejercicios». | ✅ 4/4 capturadas · 1 revisadas |
| RF-05 | 03 | Web | `RF-05/web/RF-05_p03_teclado-espacio_*` | Casilla marcada con la barra espaciadora y el foco visible. | ✅ 4/4 capturadas · sin revisar |
| RF-06 | 01 | Web | `RF-06/web/RF-06_p01_dia-pantalla-completa_*` | El día se edita en una pantalla completa (no un modal), con la barra de progreso y «Lunes» / «Miércoles». | ✅ 4/4 capturadas · sin revisar |
| RF-06 | 01 | Móvil | `RF-06/movil/RF-06_p01_dia-pantalla-completa_*` | El día se edita en una pantalla completa (no un modal), con la barra de progreso y «Lunes» / «Miércoles». | ✅ 1/1 capturadas · sin revisar |
| RF-06 | 02 | Web | `RF-06/web/RF-06_p02_buscar-press_*` | Resultados filtrados por la búsqueda. | ✅ 4/4 capturadas · sin revisar |
| RF-06 | 02 | Móvil | `RF-06/movil/RF-06_p02_buscar-press_*` | Resultados filtrados por la búsqueda. | ✅ 1/1 capturadas · sin revisar |
| RF-06 | 03 | Web | `RF-06/web/RF-06_p03_anadido-1-ejercicio_*` | «+» convertido en «✓ Añadido» y la barra inferior con «1 ejercicio». | ✅ 4/4 capturadas · sin revisar |
| RF-06 | 03 | Móvil | `RF-06/movil/RF-06_p03_anadido-1-ejercicio_*` | «+» convertido en «✓ Añadido» y la barra inferior con «1 ejercicio». | ✅ 1/1 capturadas · sin revisar |
| RF-06 | 04 | Web | `RF-06/web/RF-06_p04_mapa-pectoral_*` | Tras elegir el pectoral mayor en la figura: lista de ese músculo con «+». | ✅ 4/4 capturadas · sin revisar |
| RF-06 | 04 | — | — | mapa-pectoral | ❌ NO cubierto en móvil. El toque sobre la figura es un gesto por coordenadas sobre un lienzo que Maestro no expone como elementos; la lista del músculo dentro del selector móvil se escribió pero no se verificó en el simulador. |
| RF-06 | 05 | Web | `RF-06/web/RF-06_p05_ficha-anadir-a-la-rutina_*` | Ficha del ejercicio con el botón fijo «Añadir a la rutina», ♥ me gusta y ☆ favorito. | ✅ 4/4 capturadas · sin revisar |
| RF-06 | 05 | Móvil | `RF-06/movil/RF-06_p05_ficha-anadir-a-la-rutina_*` | Ficha del ejercicio con el botón fijo «Añadir a la rutina», ♥ me gusta y ☆ favorito. | ✅ 1/1 capturadas · sin revisar |
| RF-06 | 06 | Web | `RF-06/web/RF-06_p06_anadido-desde-ficha-2-ejercicios_*` | Añadir desde la ficha vuelve a la lista con «2 ejercicios». | ✅ 4/4 capturadas · sin revisar |
| RF-06 | 06 | Móvil | `RF-06/movil/RF-06_p06_anadido-desde-ficha-2-ejercicios_*` | Añadir desde la ficha vuelve a la lista con «2 ejercicios». | ✅ 1/1 capturadas · sin revisar |
| RF-06 | 07 | Web | `RF-06/web/RF-06_p07_ver-y-ordenar_*` | Ver y ordenar: lista del día con series, repeticiones, RIR, descanso y nota. | ✅ 4/4 capturadas · sin revisar |
| RF-06 | 07 | Móvil | `RF-06/movil/RF-06_p07_ver-y-ordenar_*` | Ver y ordenar: lista del día con series, repeticiones, RIR, descanso y nota. | ✅ 1/1 capturadas · 1 revisadas |
| RF-06 | 08 | Web | `RF-06/web/RF-06_p08_atras-conserva_*` | Vuelta a la semana: el día conserva sus 2 ejercicios (en la web, tras recargar la página). | ✅ 4/4 capturadas · sin revisar |
| RF-06 | 08 | Móvil | `RF-06/movil/RF-06_p08_atras-conserva_*` | Vuelta a la semana: el día conserva sus 2 ejercicios (en la web, tras recargar la página). | ✅ 1/1 capturadas · sin revisar |
| RF-07 | 01 | Web | `RF-07/web/RF-07_p01_ficha-favorito_*` | ☆ Favorito activado en la ficha. | ✅ 4/4 capturadas · sin revisar |
| RF-07 | 01 | Móvil | `RF-07/movil/RF-07_p01_ficha-favorito_*` | ☆ Favorito activado en la ficha. | ✅ 1/1 capturadas · sin revisar |
| RF-07 | 02 | Web | `RF-07/web/RF-07_p02_filtro-favoritos_*` | Ejercicios con el filtro Favoritos: aparece el ejercicio marcado. | ✅ 4/4 capturadas · 1 revisadas |
| RF-07 | 02 | Móvil | `RF-07/movil/RF-07_p02_filtro-favoritos_*` | Ejercicios con el filtro Favoritos: aparece el ejercicio marcado. | ✅ 1/1 capturadas · sin revisar |
| RF-07 | 03 | Web | `RF-07/web/RF-07_p03_me-gusta-mas-uno_*` | ♥ activado y el contador +1. | ✅ 4/4 capturadas · sin revisar |
| RF-07 | 03 | Móvil | `RF-07/movil/RF-07_p03_me-gusta-mas-uno_*` | ♥ activado y el contador +1. | ✅ 1/1 capturadas · sin revisar |
| RF-07 | 04 | Web | `RF-07/web/RF-07_p04_me-gusta-menos-uno_*` | Quitar el me gusta: contador −1. | ✅ 4/4 capturadas · sin revisar |
| RF-07 | 04 | Móvil | `RF-07/movil/RF-07_p04_me-gusta-menos-uno_*` | Quitar el me gusta: contador −1. | ✅ 1/1 capturadas · sin revisar |
| RF-07 | 05 | Web | `RF-07/web/RF-07_p05_cuenta-b-ve-contador_*` | Con la cuenta B, la misma ficha muestra el contador público y NO el favorito de A. | ✅ 4/4 capturadas · 1 revisadas |
| RF-07 | 05 | — | — | cuenta-b-ve-contador | ❌ NO cubierto en móvil. Cambiar de cuenta en el simulador exige cerrar sesión y entrar con otra; la comprobación entre cuentas sólo existe en la web. |
| RF-08 | 01 | Web | `RF-08/web/RF-08_p01_vista-mes-descargas_*` | Vista Mes de 12 semanas con S4, S8 y S12 marcadas «Descarga». | ✅ 4/4 capturadas · sin revisar |
| RF-08 | 01 | Móvil | `RF-08/movil/RF-08_p01_vista-mes-descargas_*` | Vista Mes de 12 semanas con S4, S8 y S12 marcadas «Descarga». | ✅ 1/1 capturadas · 1 revisadas |
| RF-08 | 02 | Web | `RF-08/web/RF-08_p02_s6-descarga_*` | S6 marcada como descarga y S5 normal. | ✅ 4/4 capturadas · 1 revisadas |
| RF-08 | 02 | Móvil | `RF-08/movil/RF-08_p02_s6-descarga_*` | S6 marcada como descarga y S5 normal. | ✅ 1/1 capturadas · sin revisar |
| RF-08 | 03 | Web | `RF-08/web/RF-08_p03_aviso-frecuencia_*` | Aviso «Piernas solo se entrena 1 vez por semana» que no bloquea Guardar. | ✅ 4/4 capturadas · sin revisar |
| RF-08 | 03 | Móvil | `RF-08/movil/RF-08_p03_aviso-frecuencia_*` | Aviso «Piernas solo se entrena 1 vez por semana» que no bloquea Guardar. | ✅ 1/1 capturadas · sin revisar |
| RF-08 | 04 | Web | `RF-08/web/RF-08_p04_dia-vacio-bloquea_*` | «Hay un día sin ejercicios» y Guardar desactivado. | ✅ 4/4 capturadas · 1 revisadas |
| RF-08 | 04 | Móvil | `RF-08/movil/RF-08_p04_dia-vacio-bloquea_*` | «Hay un día sin ejercicios» y Guardar desactivado. | ✅ 1/1 capturadas · sin revisar |

## Revisiones

| Captura | Observación |
|---|---|
| `RF-05_p02_lunes-jueves-con-3_1440_claro.png` | Revisada (agente, 2026-10-08): Lunes y Jueves con «3 ejercicios», Miércoles y Viernes con 0; barra «4 días · 12 semanas» y Siguiente visibles. Sin defectos. |
| `RF-07_p02_filtro-favoritos_390_claro.png` | Revisada (agente, 2026-10-08): filtro «Favoritos» activo y la lista muestra «barbell bench press». La imagen del ejercicio no carga (la siembra local no sirve medios); es un hecho del entorno. |
| `RF-07_p05_cuenta-b-ve-contador_1440_claro.png` | Revisada (agente, 2026-10-08): cuenta B (expiring.mock) ve «Me gusta · 1» (el de la cuenta A) y ☆ Favorito sin marcar. Junto a la cabecera sigue el botón «Agregar a frecuentes», que es el favorito antiguo de la biblioteca y no el nuevo (hallazgo: dos conceptos con icono de corazón en la misma ficha). |
| `RF-08_p04_dia-vacio-bloquea_1440_claro.png` | Revisada (agente, 2026-10-08): «Hay un día sin ejercicios: Viernes» en rojo con icono, aviso de frecuencia en ámbar, «Guardar» desactivado y «Resuelve lo marcado para guardar». |
| `RF-08_p02_s6-descarga_390_oscuro.png` | Revisada (agente, 2026-10-08): la tabla Mes cabe en 390 px con las 7 columnas; S6 con borde de selección y panel «Descarga / Normal» sobre la tabla. |
| `RF-05_p03_dos-dias-seleccionados_ios_oscuro.png` | Revisada (agente, 2026-10-08): Lunes y Jueves con marca ✓ y borde de acento, «2 días seleccionados» y botones «Cancelar» y «Configurar juntos» completos (sin truncar). |
| `RF-05_p04_lunes-y-jueves-con-3_ios_oscuro.png` | Revisada (agente, 2026-10-08): tras Configurar juntos, Lunes y Jueves con «3 ejercicios». |
| `RF-06_p07_ver-y-ordenar_ios_oscuro.png` | Revisada (agente, 2026-10-08): primer ejercicio editado a Series 4, Reps 6–8 (el valor se escribió con el teclado, borrando el anterior). Limitación: la lista se ordena con flechas, no arrastrando. |
| `RF-08_p01_vista-mes-descargas_ios_oscuro.png` | Revisada (agente, 2026-10-08): S4, S8 y S12 atenuadas y con la etiqueta «Descarga». La captura es de la ventana, así que S1 y S2 quedan fuera de plano. |

## Backoffice (RF-B1..B3)

# Índice de evidencia · Rutinas REPP (backoffice web)

Capturas de Playwright (`apps/web/e2e/*.spec.ts`, proyectos `evidencia-{390,1440}-{claro,oscuro}`), inspeccionadas a mano
una muestra por RF. Nombre: `RF-Bx_pNN_<paso>_<ancho>_<tema>.png`. Corrida: 32 pruebas en verde (8,8 min), con
`console.error`, respuestas 5xx y axe (WCAG A/AA serio/crítico) vigilados en cada paso.
Datos: `apps/web/scripts/seed-evidencia-rutinas.mjs` contra Postgres desechable y backend de la rama `feat/rutinas-repp-f1-datos`.

| RF | Estado | API | Móvil | Web | TEST | CI | Observaciones |
|---|---|---|---|---|---|---|---|
| RF-B1 | 🟡 | verificada en el spec (estado y aviso al autor vía backend) | n/a | [36 capturas](RF-B1/web) | no probado | `yarn turbo run source-check type-check lint test` en verde | Falta paso 05 con dos gimnasios en TEST; comentario sin texto (ver abajo) |
| RF-B2 | 🟡 | verificada en el spec | «sello en el móvil» NO probado | [32 capturas](RF-B2/web) | no probado | idem | Crear oficial desde el formulario web simple, no el asistente |
| RF-B3 | 🟡 | verificada en el spec (bono único, auditoría) | n/a | [28 capturas](RF-B3/web) | no probado | idem | |

## Pasos capturados

| RF | Paso | Captura (prefijo) |
|---|---|---|
| RF-B1 | 01 cola con un caso de cada tipo | `p01_cola-tipos-nuevos` |
| RF-B1 | 02 vista previa rutina / ejercicio / comentario | `p02_vista-previa-*` |
| RF-B1 | 03 tomar y ocultar | `p03_rutina-ocultada` |
| RF-B1 | 04 restaurar | `p04_boton-restaurar`, `p04_rutina-restaurada` |
| RF-B1 | 05 admin de otro gimnasio | `p05_otro-gimnasio-sin-casos` |
| RF-B1 | extra: SYSTEM_ADMIN | `p06_sistema-moderacion-global` |
| RF-B2 | 01 lista de oficiales | `p01_lista-oficiales` |
| RF-B2 | 02 crear oficial | `p02_formulario-crear-oficial`, `p02_oficial-creada` |
| RF-B2 | 03 desmarcar / marcar | `p03_desmarcada`, `p03_marcada-otra-vez` |
| RF-B2 | 04 métricas | `p04_metricas` |
| RF-B2 | 05 admin de gimnasio sin acceso | `p05_sin-acceso-admin-gimnasio` |
| RF-B2 | 06 auditoría | `p06_auditoria-acciones` |
| RF-B3 | 01 ficha | `p01_ficha-entrenamiento` |
| RF-B3 | 02 recalcular (confirmar, resultado, idempotente, sigue sin cumplir) | `p02_*` |
| RF-B3 | 03 botón desactivado sin `support:respond` | `p03_boton-desactivado-sin-permiso` |
| RF-B3 | 04 sin `support:read` | `p04_sin-permiso-de-lectura` |
