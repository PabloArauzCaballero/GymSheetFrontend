# Línea base — gates de web y paquetes (H0.S1.M4)

Medido el 2026-10-24 sobre `claude/brave-pasteur-t5425i` @ `157b0c4`. Solo medición: no se editó nada.
Entorno: Linux, Node v22.22.0 (ICU 77.1, TZ UTC), Yarn 1.22.22. El CI del repo usa Node 22.
Peldaño de evidencia: RUNS (install, type-check, lint, source-check, build) y TESTED (tests, con 1 rojo).
Nada llega a VERIFIED: no se ejercitó runtime.

## Resumen

| # | Gate | Comando | Exit | Veredicto |
|---|---|---|---|---|
| 1 | Install | `yarn install --frozen-lockfile` | 0 en el 5.º intento (1.º–4.º: 1) | PASS tras reintentos (ENVIRONMENT) |
| 2 | Turbo | `yarn turbo run source-check type-check lint test --filter=!@gymsheet/mobile --continue` | 1 (27 de 28 tareas OK) | FAIL solo `@gymsheet/web#test` |
| 2a | source-check | (turbo) | 0 | PASS |
| 2b | type-check | (turbo) | 0 en 12 paquetes | PASS |
| 2c | lint | (turbo) | 0 en 12 paquetes | PASS (web: 1 warning, 0 errores) |
| 2d | test | (turbo) | anatomy, api-client, domain, hooks: 0 · web: 1 | FAIL, 1 test de 514 |
| 3 | Aislamiento | `yarn vitest run src/features/training-invitations/components/training-invitations-client.test.tsx` (en `apps/web`) | 1 | Reproducible |
| 4 | Build web | `yarn workspace @gymsheet/web build` | 0 | PASS (sin `.env`) |

## Tests por paquete

| Paquete | Pasan | Fallan |
|---|---|---|
| anatomy (node --test) | 91 | 0 |
| api-client | 18 | 0 |
| domain | 264 | 0 |
| hooks | 123 | 0 |
| web (vitest, 104 archivos) | 513 | **1** |
| auth, design-tokens, notifications, observability, schemas, types, tsconfig | sin tarea `test` en turbo | — |

Total medido: 1009 pasan, 1 falla.

## Salida literal recortada

Install, intentos 1–4 (exit 1, firma de carrera de symlinks descrita en `.yarnrc`):

```text
1: ENOENT ... react-native-screens/.yarn-tarball.tgz
2: ENOENT: lstat '.../packages/api-client/node_modules'
3: ENOENT: lstat '.../node_modules/@gymsheet/mobile'
4: ENOENT: lstat '.../packages/api-client/node_modules/typescript'
```

Intento 5:

```text
success Already up-to-date.
dedupe-react: sin duplicados de React en el árbol hoisted.
EXIT=0
```

Turbo:

```text
@gymsheet/web:lint:   18:3  warning  'entityId' is defined but never used  @typescript-eslint/no-unused-vars
@gymsheet/web:test:  FAIL  src/features/training-invitations/components/training-invitations-client.test.tsx > TrainingInvitationsClient > accepts only the visible current revision and refreshes the agenda
@gymsheet/web:test: TestingLibraryElementError: Unable to find an element with the text: domingo, 2 de junio de 2030, 2:00 p. m.
@gymsheet/web:test:       Tests  1 failed | 513 passed (514)
 Tasks:    27 successful, 28 total
 Failed:    @gymsheet/web#test
EXIT=1
```

Build:

```text
▲ Next.js 16.2.0 (Turbopack)
✓ Compiled successfully in 22.6s
Generating static pages using 3 workers (61/61)
Done in 52.06s.   EXIT=0
```

## Fallos clasificados

| Fallo | Clase | Evidencia |
|---|---|---|
| `training-invitations-client.test.tsx` > «accepts only the visible current revision…» | TEST_BUG que solo aparece con esta versión de ICU/Node (condición de ENVIRONMENT) | El test arma el texto esperado con `Intl.DateTimeFormat('es-BO', …)`. Con ICU 77.1 devuelve `p.<U+00A0>m.` (bytes `20 70 2e a0 6d 2e`). El DOM renderiza el mismo NBSP, pero `getByText` con string normaliza el texto del nodo y el esperado conserva el NBSP, así que nunca coincide. Las otras 8 pruebas del archivo pasan; componente y zona horaria no son la causa. Corrección probable (no aplicada, no debilita el requisito): normalizar el esperado con `.replace(/\s/g, ' ')` o usar un matcher función. No se comprobó con otro Node/ICU ni contra el CI remoto. |
| Install falla 4 veces y pasa a la 5.ª | ENVIRONMENT | Carrera de symlinks; `ci.yml` ya reintenta con `yarn install --frozen-lockfile \|\| yarn install --frozen-lockfile` |
| Lint web: `entityId` sin usar en `apps/web/src/features/directory/components/order-checkout-modal.tsx:18` | PRODUCT_BUG menor (código muerto), no bloquea | Exit 0; el lint de web no usa `--max-warnings 0`. Está en el módulo de marketplace web, relevante para H7 |

## No cubierto

- `@gymsheet/mobile` (medido en `gates-frontend.md`).
- Playwright, E2E y cualquier prueba de runtime o visual: no hay backend, Postgres ni navegador en esta corrida.
- Build con variables reales de producción (`BACKEND_API_URL`, `MEDIA_PROXY_SECRET`, `NEXT_PUBLIC_*`).
- `yarn verify` y `turbo run build` completo.
- Hipótesis ICU/Node no comprobada con otro patch ni con el CI remoto.
- Una sola corrida completa: no se auditó si hay tests flaky. Todo con `cache miss`.
- Los fallos de install 1–4 no se diagnosticaron más allá de la firma de la carrera.
