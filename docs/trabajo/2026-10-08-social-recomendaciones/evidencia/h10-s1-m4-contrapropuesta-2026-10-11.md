# H10.S1.M4 — contrapropuesta con revisión e idempotencia

Fecha: 2026-10-11

Se agregó `POST /me/training-invitations/:id/counterpropose`. La contrapropuesta crea una revisión append-only y un comando `COUNTERPROPOSE` en una transacción. Exige que la invitación siga pendiente, que la conexión continúe activa/no bloqueada, que la revisión esperada sea actual y que actúe la otra persona respecto de quien propuso la revisión vigente. Se pueden aceptar invitaciones ambos participantes, pero solo desde la revisión vigente y por una persona distinta de su proponente.

## Verificación

- PostgreSQL E2E focal `-t 'H10.S1.M4'` — PASS. Dos solicitudes concurrentes con la misma clave y payload devuelven 200 y una revisión/comando; mismo request ID con payload cambiado devuelve 409; el invitador no puede contestar su propia propuesta inicial; aceptar revisión 1 luego de la contrapropuesta devuelve 409; el invitador acepta revisión 2 correctamente.
- E2E completo de `test/social/entrenar-juntos.e2e-spec.ts` — PASS, 2/2.
- Schema unitario — PASS, 6/6.
- Type-check, ESLint focal, Prettier focal y `git diff --check` — PASS.
- Migración `202610110004-training-invite-counterproposals` aplicada a PostgreSQL QA local.
- Limpieza verificada: `h10_m4_users=0`, invitaciones huérfanas `0`, comandos de contrapropuesta `0`, bases `h10_*` temporales `0`.

Migración: `202610110004-training-invite-counterproposals.ts`. El `down` falla de manera explícita si ya existen comandos de contrapropuesta o aceptaciones por el proponente original; no elimina esos datos silenciosamente.

H10.S1.M4 queda HECHO en el alcance backend. H10.S1.M3 permanece EN CURSO: aceptar guarda su revisión y respuesta, pero todavía no crea la entidad de encuentro ni un evento tipado de chat.
