# H10 — auditoría de seguridad de drivers API

Fecha: 2026-10-12

## Decisión

No se añadieron drivers API H10.S1/S2/S4. Los roles de `run-social-pair.py` no reciben fixtures desechables ni existe una preparación/limpieza segura que permita demostrar estas filas sin dejar cambios en cuentas reales. Mantenerlas `BLOCKED` evita registrar como aceptación PAIR una prueba incompleta o persistir cambios ajenos.

## Bloqueos concretos

- **S1.M1–M5:** requieren crear invitaciones, responderlas o proponer revisiones entre A y B. El API no tiene una ruta para eliminar y revertir el historial de invitación/revisiones. M3 además produce meeting y evento de chat; M4 cambia revisión/estado; M5 depende de una invitación expirada controlada. Ningún ID de pareja/invitación reservada está definido para estos casos.
- **S1.M6:** `DELETE /me/connections/:id` desconecta a la pareja, cancela reuniones y revoca chat. No hay operación inversa que restaure conexión, reuniones y acceso al historial; no debe ejecutarse sin pareja desechable identificada y consentimiento específico.
- **S2.M1:** el criterio requiere sesiones de cada participante. El API de workouts crea registros persistentes y no vincula una sesión a la invitación; sin cuentas/sesiones aisladas no se prueba el escenario de encuentro.
- **S2.M2:** `GET /me/training-invitations/:id/shared-session` es de solo lectura, pero necesita invitación `SHARED_SESSION` aceptada. No hay fixture reservado configurado; la pareja de roles A/B tampoco cubre el control de un tercero no autorizado. Una lectura aislada no demostraría la aceptación y aislamiento completos.
- **S2.M3:** crear/editar series escribe pesos e historial por usuario. No hay endpoint de cleanup fiable para retirar únicamente los registros de la corrida.
- **S2.M4:** `PATCH /workouts/:id/finish` completa la sesión y puede otorgar XP persistente. No hay reversión segura de progreso/recompensas.
- **S2.M5:** cancelar el encuentro cambia estado persistido y exige además una sesión previamente completada; no existe una fixture desechable declarada para correlacionar invitación, participantes e historial.
- **S4.M1/M2:** sus criterios requieren migrar y comprobar datos/constraints en una base aislada y `template0`. Una API HTTP no puede aplicar ni verificar estas migraciones. Duplicar esta cobertura con un rol `A_API` afirmaría una prueba distinta. Las pruebas PostgreSQL de migración aislada ya cubren M1/M2; ver [QA backend H10.S2/S4](backend-h10-s2-s4-qa-2026-10-12.md).
- **Entorno de ejecución:** el preflight registrado no tiene API lista ni fixture `QA_H10_DISPOSABLE_INVITATION_ID`; las pruebas locales del runner verifican que los casos sin drivers se reportan `BLOCKED` antes de lanzar acciones.

## Verificación

- `python3 -m unittest scripts/qa/test_run_social_pair.py` — PASS, 55/55.
- `python3 -m py_compile scripts/qa/run-social-pair.py scripts/qa/test_run_social_pair.py` — PASS.
- El contrato `test_h10_phase_manifest_registers_cases_and_blocks_missing_drivers` verifica las 18 filas, sus roles y que manifiestos sin drivers quedan `BLOCKED`, sin evidencia ni secretos.
- [Preflight H10](h10-pair-preflight-final-2026-10-12.json) registra los drivers faltantes y no declara aceptación.

Para habilitar futuros drivers S1/S2 se necesita un ambiente QA local/efímero, A/B (y C para privacidad) desechables, fixtures identificables por `runId` y una limpieza comprobable; M4 requiere además una política explícita para recompensas. S4 debe continuar ejecutándose como prueba de migración aislada, no como driver HTTP.
