# Defectos pendientes hallados al capturar el móvil (2026-10-11)

Hallados con Maestro en el simulador iPhone 17 Pro contra el backend local (:3011, base `gym_sheet`). Los que se
corrigieron en esta rama no están aquí (botones del borrador pendiente: `steps-basic.tsx`).

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
- `PROGRAM_FINISHED` (RF-19 p01), `PROGRAM_WEEK_CLOSED` y `ROUTINE_SHARE_INVITE` (RF-13 p03) se guardan como mensajes
  `IN_APP` en `notifications.messages` (estado PENDING) pero ni el móvil ni la web tienen una bandeja que los muestre,
  y el permiso de notificaciones de iOS no se concede por `simctl privacy` (`Operation not permitted`), por eso no hay
  captura. Pasos: cerrar semanas con `run-23-racha.sh` y consultar
  `select subject, body, status from notifications.messages order by created_at desc limit 2`.

## D8 · Fragilidad de `open-routine.subflow.yaml` con muchas rutinas
- Con ~20 rutinas en «Mías» la tarjeta buscada queda bajo la barra de pestañas y `scrollUntilVisible` (que se desplaza
  antes de mirar) la pasa de largo; el buscador no siempre filtra. Los flujos nuevos abren la rutina por enlace
  (`open-routine-by-id.subflow.yaml`, `start-day-by-id.subflow.yaml`). Los flujos viejos (11, 17, 18, 19, 21, 22) siguen
  usando el subflujo antiguo.
