# H10 DECLINE — verificación final

Fecha: 2026-10-13. Alcance: serializar la respuesta vigente de una invitación rechazada.

## Hallazgo y corrección

El E2E PostgreSQL detectó que `POST /me/training-invitations/:id/respond` omitía `meeting` al responder `DECLINE`, aunque una invitación sin encuentro debe devolver `meeting: null`. `TrainingInvitationsService.projectCurrentInvite` ahora proyecta el encuentro persistido cuando existe y devuelve `null` cuando no existe.

## Verificación

- Base QA desechable local `gymsheet_social_qa` en PostgreSQL 16.14; registry migrada completa y seed base sintético.
- `yarn test:e2e --runTestsByPath test/social/entrenar-juntos.e2e-spec.ts --runInBand --silent` — PASS, 9/9.
- `yarn type-check` — PASS.
- ESLint focal de `training-invitations.service.ts` — PASS.
- `git diff --check` — PASS.
- Limpieza SQL posterior: `h10_users=0`, `invitations=0`, `meetings=0`, `meeting_chat_events=0`.

La base temporal de QA no contiene datos persistentes del usuario. El E2E verifica el contrato backend; no sustituye el recorrido PAIR móvil/web.
