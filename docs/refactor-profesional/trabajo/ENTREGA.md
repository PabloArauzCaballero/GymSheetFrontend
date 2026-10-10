# Entrega — qué se hizo, qué se probó, qué queda

> Sesión del 2026-09-21/22. Alcance acordado: `apps/web` primero, `apps/mobile` en una segunda
> pasada. Regla que gobierna este documento (R14 de `ESPECIFICACION_OBJETIVO.md`): distinguir
> observado / supuesto / propuesto / no ejecutado.

## Lo que cambió para quien usa el producto

| Cambio | Quién lo nota | Commit |
|---|---|---|
| Auditoría, permisos, moderación y «denunciar» dejan de dar 404 | Personal de gimnasio y plataforma | `b828c17` |
| El personal del gimnasio deja de ver la aplicación del socio; entra directo a su panel | `ADMIN`, `FRONT_DESK` | `f9813eb` |
| En `/admin/*` deja de haber dos entradas de menú encendidas a la vez | Personal de gimnasio | `f9813eb` |
| Último `font-bold` del barrido de ADR-0003 pasa a `font-semibold` | Cosmético, dos insignias numéricas | `083063b` |

Y un commit de checkpoint (`322175e`) que puso bajo control de versiones el portal admin V2
(auditoría, moderación, consola `/sistema`) que llevaba días sin commitear en el árbol.

## Hallazgos, con su estado real

| ID | Hallazgo | Severidad | Estado |
|---|---|---|---|
| H01 | El allowlist del BFF nunca aprendió `admin/audit`, `admin/permissions`, `admin/moderation` ni `me/reports`: cuatro pantallas del portal admin estaban desconectadas del backend, con un 404 falso y un toast de error visible | P1 | **Corregido y verificado** (65/65 en su test + reproducción en vivo 404→200) |
| H02 | El tour de onboarding no persiste: cualquier recarga lo reinicia en 1/5 | P2 | **Abierto.** La mitigación con `sessionStorage` se revirtió: viola `source-check`, que prohíbe Web Storage. Corresponde al backend (`/me/tutorial-progress`), que no existe |
| H03 | El aviso de membresía vencida se muestra igual a cuentas de personal | P3 | **Resuelto de otra forma**: el personal ya no aterriza en el panel del socio |
| — | El panel del gimnasio estaba enterrado bajo quince destinos de socio | P1 de IA | **Corregido** (`f9813eb`) |

## Verificación ejecutada

- `yarn turbo run source-check type-check lint test --filter=!@gymsheet/mobile` → **22/22 tareas,
  226/226 pruebas** tras el último cambio de navegación. Repetido tras el rebase sobre `origin/dev`.
- Suite E2E de Playwright (`e2e/*.spec.ts`) contra backend real: **se ejecutaron 22 de 54** antes
  de detenerla para liberar el entorno a petición del usuario. 18 en verde; 4 fallos sin
  diagnosticar a fondo (imagen QR de plan, catálogo de ejercicios, imágenes comerciales,
  validación de correo en login). **No se descartaron como ruido**: quedan pendientes de
  diagnóstico, y tres de ellos huelen a los medios apuntando al backend viejo (`:3001`), que es
  ruido de entorno documentado, pero eso está por confirmar, no confirmado.
- Recorrido manual con cuatro cuentas reales (`super@qa.test`, `admin.a@qa.test`,
  `athlete.mock@…`, intento con `socio.a@qa.test`) en escritorio y a 375 px. Capturas en
  `trabajo/evidencia/`.
- Piloto vertical completo: crear entrenamiento → agregar ejercicio → registrar serie → finalizar
  → verificar en el historial. Persistencia real confirmada.

## Lo que NO se hizo (y por qué)

- **`apps/mobile`**: fuera del alcance acordado para esta pasada.
- **Fases 08-10 completas** (migración de todas las rutas, accesibilidad y QA exhaustivos): se
  cubrieron por muestreo, no de forma exhaustiva. La suite E2E del propio repo ya trae un barrido
  con axe-core sobre ~26 rutas × 3 roles (`e2e/qa-sweep.spec.ts`) que **no llegó a ejecutarse
  entero** — es el siguiente paso obvio y barato para cerrar esas fases con datos.
- **Rendimiento**: no se midió nada. Ni laboratorio ni campo. Cualquier afirmación sobre
  Core Web Vitals en este trabajo sería inventada.
- **Las seis capacidades que faltan para el admin de gimnasio** (horarios pico, salidas,
  equipamiento más pedido, encuestas, carga masiva de sedes, comunidad como gestión): están
  analizadas y priorizadas en `ADMIN_GIMNASIO.md`, sin construir. Son funcionalidad nueva de punta
  a punta, no refactorización.

## Cómo revertir

Cada cambio es un commit independiente y revertible con `git revert`:
- Navegación por audiencia: `f9813eb` (revertirlo devuelve la navegación única de antes).
- Allowlist del BFF: `b828c17` (revertirlo vuelve a cortar las cuatro rutas; sólo tiene sentido si
  una de ellas resultara peligrosa de exponer).
- Barrido de `font-weight`: `083063b`.

Rama de respaldo con el estado previo al rebase: `respaldo/dev-antes-de-rebase-20260923`.

## Deuda que queda registrada

1. **El backend del portal admin V2 sigue sin commitear** en `GymSheetBackend` (controladores de
   auditoría/moderación/permisos, migraciones, guard). El frontend desplegado llamará a endpoints
   que el backend desplegado no tiene hasta que eso se suba. **Es el bloqueo más importante de
   esta lista.**
2. H02: `/me/tutorial-progress` en el backend.
3. Los 4 fallos E2E sin diagnosticar.
4. El barrido `qa-sweep` completo (accesibilidad + overflow + errores de consola por ruta).
