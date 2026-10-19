# Defectos hallados al capturar el móvil (2026-10-11)

Hallados con Maestro en el simulador iPhone 17 Pro contra el backend local (:3011, base `gym_sheet`).

## Actualización 2026-10-15

- D7 tiene implementación local: bandeja móvil paginada, acción de marcar leído y total no leído enlazado desde Inicio, con `GET /notifications/me/unread-count` en backend. Falta aceptación en app y API activas.
- D8 tiene implementación local: los consumidores conservan `TAB`/`NAME`, pero abren por ID profundo; el buscador y el desplazamiento de una lista larga ya no forman parte del flujo. Falta ejecutar Maestro en simulador.
- Verificación: backend `yarn type-check` PASS; frontend móvil TypeScript PASS al excluir el archivo de pruebas sociales que no resuelve `vitest/globals` en esta instalación; `node --check` del helper y `git diff --check` PASS. No se hizo aceptación visual ni PAIR: Docker, API local y simuladores no están disponibles.

| # | Estado | Cierre |
|---|---|---|
| D1 «+0 puntos» | CERRADO | `CountUpText` fija la cifra final con un `Text` al terminar la cuenta (`motion.tsx`). Evidencia: «+78/+77/+99/+65 puntos» en RF-18 p00, p00b, p01, p04 y RF-15 p04, p05. |
| D2 insignias «+0 pts» | CERRADO | misma causa y mismo arreglo. Evidencia: RF-18 p03 (+120, +100, +130, +300 pts). |
| D3 bono sin que la sesión cuente | CERRADO | `showsModeBonus` (`session-block-copy.ts`, con prueba `session-block-copy.test.ts`). Evidencia: RF-15 p04/p05 sin «+13 por sobrecarga»; RF-18 p01 lo conserva porque la sesión cuenta. |
| D4 «1 de 0» | CERRADO | `describeSessionCount` (misma prueba). Evidencia: RF-18 p00b «Esta sesión cuenta para tu programa (semana 1).». |
| D5 «No pudimos cargar tus recomendaciones» | NO ES DEFECTO | el backend :3011 (`GymSheetBackend` e2244fd, `dist` anterior a 10a) no tiene `GET /routines/recommended`: la ruta cae en `/routines/:id` y responde 400 «El identificador debe ser un UUID válido». Con un backend con 10a desaparece. |
| D6 aviso tapa «Volver» / accesible | CERRADO (parcial en la verificación) | tarjeta más baja y delgada, sin captura de toques si no tiene acción, y `announceForAccessibility`. Evidencia visual: RF-12 p04. Maestro/XCUITest sigue sin listar el aviso en el árbol, así que la lectura por VoiceOver no se pudo comprobar en el simulador. |
| D7 sin bandeja de avisos | IMPLEMENTACIÓN LOCAL; falta QA móvil | Bandeja paginada, lectura individual y contador de no leídos en Inicio; backend añade `GET /notifications/me/unread-count`. |
| D8 fragilidad de open-routine | IMPLEMENTACIÓN LOCAL; falta Maestro | `open-routine.subflow.yaml` conserva su interfaz y resuelve la rutina por ID antes de navegar; se elimina la búsqueda y el scroll frágil para todos sus consumidores. |

Detalle histórico de los cerrados (pasos para reproducirlos antes del arreglo) más abajo.

## D1 · El titular «+0 puntos» del resumen de la sesión no llega al total
- **Dónde:** pantalla «Sesión terminada» (`apps/mobile/src/components/session-summary.tsx`, `CountUpText` de `motion.tsx`).
- **Qué se ve:** «Puntos de la sesión» enseña «+0 puntos» (también varios segundos después) aunque el desglose suma
  +50 +6 +22 y la etiqueta de accesibilidad dice «Has ganado 78 puntos».
- **Reproducir:** terminar cualquier sesión de fuerza con 3 series; esperar 5 s en el resumen. Visible en
  `RF-18_p00`, `RF-18_p01_bono-del-modo…`, `RF-18_p04`, `RF-15_p04` y `RF-15_p05`.
- **Nota:** en Trayectoria el mismo contador sí sube hasta el total (7755). Sospecha: el valor compartido de
  Reanimated no se anima cuando el resumen se monta bajo una celebración o con la pantalla en segundo plano. No se
  investigó más.

## D2 · Las insignias salen con «+0 pts» en la lista de Trayectoria
- `RF-18_p03_insignia-por-racha-de-semanas`: todas las insignias dicen «+0 pts»; el catálogo da 120 a
  `MODO_SOBRECARGA_4` (`progression.badges.points_reward`), y la celebración enseñó «+ 6 pts» a mitad de cuenta.
- **Reproducir:** ganar «Cuatro semanas de sobrecarga» (flujo `run-23-racha.sh`) y abrir Trayectoria › Insignias.

## D3 · El bloque «Tu programa» promete bono aunque la sesión no cuente
- `RF-15_p04` y `RF-15_p05`: «Para contar necesitas al menos 10 minutos y 3 series.» y, justo debajo,
  «+13 por sobrecarga (x1,2 al cumplir la semana)». `program-session.service.ts` calcula `bonusModo` siempre que el
  modo no sea NONE, cuente o no la sesión (`session-program-block.tsx` lo pinta sin mirar `sesionCuenta`).
- **Arreglo propuesto:** pintar el bono solo si `block.sesionCuenta`, con prueba del bloque.

## D4 · «Esta sesión cuenta: 1 de 0 de la semana 1»
- Si el programa se activa un día en que la semana 1 no tiene días planeados (p. ej. el domingo con «Empuje 4 días»,
  que no tiene domingo), `sesionesPlanSemana` es 0 y el texto queda «1 de 0».
- **Reproducir:** activar «Empuje 4 días» (L-M-J-V) en domingo, terminar una sesión de 10+ min. Captura no guardada.
- **Arreglo propuesto:** si el plan es 0, decir «Esta sesión cuenta para tu programa.» sin fracción.

## D5 · «No pudimos cargar tus recomendaciones» en Rutinas
- Se ve en casi todas las capturas de Rutinas con el backend local :3011 (`RF-18_p01`, `p02`, …): el endpoint de
  recomendadas responde error en esa instancia (build de `dist` anterior a las recomendadas, 10a). No es del móvil;
  conviene repetir esas capturas contra un backend con 10a.

## D6 · El aviso «Gracias. Lo revisaremos.» tapa «‹ Volver» y no está en el árbol de accesibilidad
- `RF-12_p04`: el toast verde se superpone al botón «Volver» de la cabecera del día. Además `maestro hierarchy` y
  `assertVisible` nunca lo ven (solo un fotograma de `simctl io screenshot`), lo que sugiere que VoiceOver tampoco lo
  anuncia (`toast-host.tsx`: la tarjeta no es `accessible` / `accessibilityLiveRegion`).

## D7 · Los avisos del servidor no tienen dónde verse
- La web ya tenía bandeja. La implementación móvil local añade la bandeja «Avisos» enlazada desde Inicio, consulta `GET /notifications/me`, muestra el total no leído y permite marcar cada mensaje como leído. Falta la aceptación con app y API activas.
- `PROGRAM_FINISHED` (RF-19 p01), `PROGRAM_WEEK_CLOSED` y `ROUTINE_SHARE_INVITE` (RF-13 p03) se guardan como mensajes
  `IN_APP` en `notifications.messages` (estado PENDING). La captura histórica no pudo hacerse porque el permiso de
  notificaciones de iOS no se concede por `simctl privacy` (`Operation not permitted`). Pasos: cerrar semanas con
  `run-23-racha.sh` y consultar
  `select subject, body, status from notifications.messages order by created_at desc limit 2`.

## D8 · Fragilidad de `open-routine.subflow.yaml` con muchas rutinas
- `open-routine.subflow.yaml` conserva el contrato `TAB`/`NAME`, pero delega ahora en `open-routine-by-id.subflow.yaml`; la rutina se resuelve por API y el flujo la abre por enlace, sin buscar ni desplazar una lista larga. Falta ejecutar los flujos Maestro en un simulador.
- Hallazgo original: con ~20 rutinas en «Mías» la tarjeta podía quedar bajo la barra de pestañas y `scrollUntilVisible`
  (que se desplaza antes de mirar) pasarla de largo; el buscador no siempre filtraba. Los flujos que llamaban al
  subflujo antiguo ahora heredan la resolución por ID; falta confirmarlo en Maestro con una cuenta que tenga muchas
  rutinas.
