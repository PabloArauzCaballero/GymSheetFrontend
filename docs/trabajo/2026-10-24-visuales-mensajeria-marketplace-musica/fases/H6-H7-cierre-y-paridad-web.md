# H6 — Regresión, gates y reporte · H7 — Paridad web (después, si Pablo lo pide)

## H6 — Regresión, gates y reporte

**Resultado observable:** el trabajo se puede abrir como PR a `dev` con todos los gates en verde,
evidencia de cada afirmación y un `REPORTE.md` cuyo primer renglón dice cuánto se cerró.
**CA:** Dado el conjunto de ramas, cuando se corre la pirámide de cierre (regla 80.1), entonces
cada etapa está en verde o su rojo está clasificado con evidencia.
**DoD:** salidas literales en `evidencia/cierre/`; `REPORTE.md` con AVANCE en la primera línea;
PR abierto y `mergeable` demostrado.
**Estado:** TODO

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H6.S1.M1 | Backend: `yarn lint && yarn type-check && yarn test && yarn test:e2e` (Postgres `:5433`) | exit 0 | `evidencia/cierre/backend.txt` | TODO |
| H6.S1.M2 | Móvil: `type-check`, `lint` (check-theme 0), `test`, vitest de chat/música/marketplace | exit 0 | `evidencia/cierre/mobile.txt` | TODO |
| H6.S1.M3 | Web + paquetes: `yarn turbo run source-check type-check lint test --filter=!@gymsheet/mobile` y `yarn workspace @gymsheet/web build` | exit 0 | `evidencia/cierre/web.txt` | TODO |
| H6.S1.M4 | Maestro completo (01-18) en simulador iOS; Android al menos 05, 16, 17, 18 | verde | `evidencia/cierre/maestro.txt` | TODO |
| H6.S1.M5 | Gates: seguridad (`security-guardrails`: ticket de socket, Bearer de media, autorización de playlist/rutina, rate limits), privacidad (sin PII en logs/capturas), accesibilidad (checklists de cada hito), `web-design-guidelines` sobre las pantallas nuevas | cada gate con veredicto | `evidencia/cierre/gates.md` | TODO |
| H6.S1.M6 | Revisores independientes: `frontend-reviewer` sobre el diff, `regression-auditor` sobre consumidores de `ConversationSummary`, `Routine`, `directoryService` | sin BLOQUEANTE abierto | informes en `evidencia/cierre/` | TODO |
| H6.S1.M7 | `REPORTE.md` (regla 40) + PRs a `dev` en `GymSheetFrontend` y `GymSheetBackend` con orden de despliegue (backend primero: contratos aditivos) y estado `mergeable` pegado | PR abiertos, sin merge | enlaces en `REPORTE.md` | TODO |

## H7 — Paridad web (opcional; no bloquea H2-H6)

Las tres áreas viven hoy en el móvil; música **no existe** en la web. La paridad se planifica
para no olvidarla, pero se ejecuta solo si Pablo la prioriza (ambigüedad A-W1).

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H7.S1.M1 | Web `/musica`: buscador, chips, cuadrícula y **tabla** (`table.tsx` + `pagination.tsx`, que ya es por páginas), ficha | misma API de H4 | tests RTL + e2e | TODO |
| H7.S1.M2 | Web ficha de rutina: sección «Música para esta rutina» y selector | misma API de H5 | tests | TODO |
| H7.S1.M3 | Web `/chat`: carril de nuevos matches, no leídos, estado Enviado/Visto, ⋯ con moderación | misma API de H2 | tests | TODO |
| H7.S1.M4 | Web `/directorio`: ficha de producto, filtros, Mis compras, allowlist (ya en H3.S2.M3) | misma API de H3 | tests + e2e `/directorio` | TODO |
| H7.S1.M5 | `docs/plan/PLAN-PARIDAD-WEB.md` actualizado con lo anterior | doc | revisión | TODO |
