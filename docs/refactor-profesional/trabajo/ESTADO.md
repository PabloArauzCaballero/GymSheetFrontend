# Estado — registro de sesión

## 2026-09-22 (continuación misma sesión)

- El usuario confirmó explícitamente avanzar sin pausas por fases autorizadas ("hacelo todo, no te
  detengas"). A partir de aquí se ejecuta fase 01 con evidencia real y se corrige en el momento el
  hallazgo más grave encontrado, en vez de solo documentarlo.
- **Entorno real levantado:** backend NestJS desde fuente en `:3005` (Postgres local
  `gymsheetbackend-postgres-1`, puerto 5433, BD `gym_sheet`), web Next.js desde fuente en `:3006`.
  Un zombi de 5 días en el puerto 3006 se mató antes de arrancar limpio.
- **Bloqueo de entorno encontrado y resuelto:** `.next` con build de producción del 15-sep
  mezclado con caché de `next dev` de hoy causaba 404 en todo el grupo `(auth)` (login/registro/
  recuperar). `rm -rf apps/web/.next` + reinicio lo resolvió. Sin esto no se podía ni loguear.
- **Fase 01 (auditoría con evidencia real) en progreso:** `trabajo/HALLAZGOS.md` con tres
  hallazgos (H01 P1, H02 P2, H03 P3) y dos notas de entorno, respaldados con capturas en
  `trabajo/evidencia/` y con cuentas reales (`super@qa.test` SYSTEM_ADMIN, `admin.a@qa.test` ADMIN).
- **H01 corregido y verificado en la misma pasada** (no solo documentado): el allowlist del BFF
  (`apps/web/src/shared/server/backend-route-policy.ts`) nunca tuvo entradas para
  `admin/audit`, `admin/permissions`, `admin/moderation` ni `me/reports` — cuatro pantallas del
  admin portal V2 recién commiteado estaban completamente desconectadas del backend real (404
  falso del BFF, visible como toast "No encontrado" al usuario). Se añadieron 16 patrones nuevos +
  tests en `backend-route-policy.test.ts` (65/65 ✅) + reproducción en vivo antes/después
  (`evidencia/sistema-auditoria.png` vs `evidencia/sistema-auditoria-FIX-H01.png`: 404→200, toast
  desaparece).
- **Verificación completa en curso:** `yarn turbo run source-check type-check lint test
  --filter=!@gymsheet/mobile` corriendo en segundo plano tras el fix de H01, para confirmar que no
  rompió nada antes de commitear.
- **Siguiente acción:** al cerrar la verificación completa, commitear el fix de H01 por separado
  (`fix(web):` — es una corrección real, no parte del checkpoint de documentación), luego seguir
  con lo pendiente de fase 01 (descubrir, recuperar contraseña) y entrar a fase 02 (UX/IA) con los
  tres hallazgos como insumo real.

## 2026-09-21

- **Candidato/rama:** `GymSheetFrontend`, rama `dev`. Sin commits nuevos (el usuario no lo ha
  pedido). Árbol con cambios previos sin commitear de una iniciativa distinta (admin portal
  V2, ver CONTEXTO_REAL.md).
- **Fase:** 00 (contexto y baseline) — completada como diagnóstico estático + checks reales.
  Fase 01 no iniciada.
- **Última tarea verificada:** T00.2 (ver PLAN_SITUADO.md).
- **Archivos creados:** `docs/refactor-profesional/**` (kit completo, verificado contra
  `MANIFEST_SHA256.txt`), `docs/refactor-profesional/trabajo/{CONTEXTO_REAL,INVENTARIO,
  BASELINE,PLAN_SITUADO,ESTADO}.md`.
- **Archivos modificados fuera de `trabajo/`:** `CLAUDE.md` — una sección aditiva al final
  ("Refactorización profesional UX/UI (en curso)"), sin tocar reglas previas.
- **Evidencia:** `yarn turbo run source-check type-check lint --filter=!@gymsheet/mobile` →
  21/21 tareas exitosas, 5m47s, sin caché en `@gymsheet/web` (log completo no adjunto como
  archivo, solo referenciado en BASELINE.md).
- **Decisiones recientes:**
  - Alcance: `apps/web` primero; `apps/mobile` en una segunda pasada (confirmado por el
    usuario).
  - ADR-0002/ADR-0003 se tratan como baseline aceptado de las fases 03/05, no se reinician.
  - Kit copiado a `GymSheetFrontend/docs/refactor-profesional/` (no al workspace raíz, que no
    es un repo git) porque el alcance UX/UI vive en el repo frontend.
- **Tareas en curso:** ninguna a medio escribir.
- **Bloqueos concretos:**
  - T00.3: falta decidir cómo secuenciar este refactor frente al trabajo sin commitear del
    admin portal V2 (mismos archivos: `nav-config.ts`, `portal-shell.tsx`, paneles de
    `features/admin/`). Tres opciones planteadas en PLAN_SITUADO.md, ninguna descartada
    técnicamente.
  - Arranque real de la app (backend + PostgreSQL) no se hizo en esta pasada; necesario para
    T01.1 en adelante.
- **Cambios ajenos presentes:** sí — ver lista de archivos modificados/sin trackear en
  CONTEXTO_REAL.md § "Hallazgo que condiciona todo lo que sigue". Se preservaron sin tocar.
- **Siguiente acción:** confirmar T00.3 con el usuario; con eso resuelto, levantar el entorno
  real (backend + Postgres) y ejecutar F01.1-F01.4 (recorrido de las tres tareas candidatas +
  capturas + `HALLAZGOS.md`) sobre las rutas fuera de `admin/`/`sistema` puede empezar ya sin
  esperar la decisión, si se prefiere paralelizar.
- **Precauciones de contexto:** no repetir la inspección estática ya hecha (INVENTARIO.md); si
  algo cambió en el árbol desde esta fecha, revalidar antes de asumir vigente.
