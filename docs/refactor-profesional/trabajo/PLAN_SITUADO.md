# Plan situado — GymSheet Frontend (apps/web primero)

> Consumir junto a CONTEXTO_REAL.md, INVENTARIO.md y BASELINE.md. Este documento se precisa en
> cada fase siguiente; aquí fija alcance, exclusiones y la secuencia de las primeras tareas.

## Alcance confirmado (2026-09-21)

- **Dentro:** `apps/web` completa — las tres navegaciones (`primaryNavigation`,
  `adminNavigation`, `systemNavigation`), sus ~27 grupos de ruta y los componentes compartidos
  (`shared/components/*`) y módulos (`features/*`) que las sirven.
- **Fuera por ahora, decisión explícita del usuario:** `apps/mobile`. Se retoma en una segunda
  pasada tras cerrar web. Mientras tanto, cualquier cambio a `packages/*` (compartido con
  mobile) se revisa contra "¿esto rompe algo que mobile consume?" aunque no se reimplemente ahí.
- **Se trata como baseline aceptado, no como punto de partida:** ADR-0002 (tokens dual-theme) y
  ADR-0003 (dirección Apple-premium, fases 0-5). La fase 03 de este kit parte de ahí — no
  reabre decisiones ya tomadas salvo que el auditoría (fase 01) encuentre una inconsistencia
  concreta.

## Decisión pendiente antes de tocar código de producto

El árbol de trabajo tiene cambios **sin commitear** de una iniciativa distinta y ya dada por
"implementada y verificada" en sesiones previas (F1/F4 de `docs/plan/PLAN-ADMIN-PORTAL-V2.md`:
auditoría, moderación, consola `/sistema`, permisos). Toca exactamente los archivos que una
reorganización de navegación/IA (fase 02) y un barrido visual del panel de admin (fase 03/06)
tendrían que tocar primero: `nav-config.ts`, `portal-shell.tsx`, los paneles de `features/admin/`,
`session.ts`, y los paquetes `domain`/`types`.

No se resuelve por inspección — es una decisión de flujo de trabajo del usuario. Tres caminos,
sin preferencia técnica fuerte por ninguno (los tres son seguros si se ejecutan bien):

1. **Commitear primero lo del admin portal** (aunque sea en un commit de checkpoint, no
   necesariamente "terminado") y arrancar el refactor de UX/UI sobre un árbol limpio. Más fácil
   de auditar después ("¿qué cambió por el refactor vs. qué ya estaba?").
2. **Seguir encima del árbol actual.** Es seguro en la práctica — `source-check`/`type-check`/
   `lint` ya pasan 21/21 con los cambios puestos (ver BASELINE.md) — pero mezclará en el mismo
   diff sin commit dos iniciativas no relacionadas, lo que complica revisar o revertir cada una
   por separado más adelante.
3. **Aislar el refactor en otra rama/worktree** mientras el admin portal sigue su curso en
   `dev`, e integrar después. Más aislamiento, más coste de fusión si ambos tocan los mismos
   archivos (probable en `nav-config.ts` y en los paneles de admin).

**Se preguntó al usuario; queda para confirmar antes de F01.1.** Hasta entonces, las tareas de
esta fase 00 (documentales) y el arranque de fase 01 sobre rutas *fuera* de `admin/`/`sistema`
(por ejemplo dashboard, entrenamientos, comunidad) pueden avanzar sin bloqueo — son
independientes del conflicto.

## Tabla de tareas iniciales (fase 00 → 01)

| ID | Fase | Resultado | Archivos reales | Prueba | Riesgo | Estado |
|---|---|---|---|---|---|---|
| T00.1 | 00 | Kit instalado y enganchado | `docs/refactor-profesional/*` (copiado), `CLAUDE.md` (sección añadida) | Checksum contra `MANIFEST_SHA256.txt` | Ninguno — solo documentación | **Verificado** |
| T00.2 | 00 | Contexto, inventario y baseline reales | `trabajo/CONTEXTO_REAL.md`, `INVENTARIO.md`, `BASELINE.md` | `yarn turbo run source-check type-check lint --filter=!@gymsheet/mobile` → 21/21 ✅ | Ninguno | **Verificado** |
| T00.3 | 00 | Decisión de secuencia sobre trabajo en curso | — | Confirmación explícita del usuario | Bloquea F01.1 si se toca `admin/`/`nav-config`/`portal-shell` primero | **Pendiente** |
| T01.1 | 01 | Arranque real de la app (web + backend + Postgres) y primeras capturas | N/A (evidencia, no código) | Backend en `:3005`/similar, web en `:3006`, captura en 2-3 roles | Requiere Docker/Postgres locales; ver `gymsheet-web-local-run.md` | Pendiente |
| T01.2 | 01 | Recorrido de 3 tareas candidatas: entrenar (flujo principal), consultar comunidad/descubrir (frecuente), recuperar contraseña o editar ejercicio (recuperación/edición) | Rutas de ROUTE-005/009/010 e INVENTARIO.md | Recorrido con datos de prueba, capturas por estado | Depende de T01.1 | Pendiente |
| T01.3 | 01 | Hallazgos con severidad (`HALLAZGOS.md`) | — | Reproducción o evidencia estática citada | — | Pendiente |

## Qué NO se hizo en esta pasada (honestidad de alcance, R14)

- No se arrancó la aplicación ni se navegó en un navegador real. Todo lo anterior es inspección
  estática de código + ejecución real de `source-check`/`type-check`/`lint`.
- No se auditaron uno por uno los 19 módulos de `features/*` ni los subcomponentes de `ui/`;
  el inventario los lista por carpeta, no por archivo.
- No se ejecutaron pruebas (`test`), build ni E2E.
- No se tocó ningún archivo de producto (fuera de la línea añadida a `CLAUDE.md`, puramente
  aditiva).
