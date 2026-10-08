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
