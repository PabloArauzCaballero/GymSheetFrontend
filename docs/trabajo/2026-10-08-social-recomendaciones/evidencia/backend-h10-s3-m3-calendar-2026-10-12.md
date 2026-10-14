# H10.S3.M3 — exportación de calendario

Fecha: 2026-10-12. Backend: `GET /me/training-invitations/:id/calendar.ics` devuelve iCalendar bruto solo al invitador o destinatario de una invitación con encuentro materializado. La prueba HTTP verifica contenido `text/calendar`, UID estable por invitación y usuario, replay idéntico, fechas UTC, estado `CANCELLED` tras desconexión y `404` para un tercero. Las pruebas unitarias cubren escape de texto, plegado UTF-8, cambio de `SEQUENCE` y ausencia de datos para no participantes.

QA: PostgreSQL 16 temporal aislado en `127.0.0.1:55432`, base `gymsheet_social_qa`; Node v22.23.3. Se aplicaron todas las migraciones, incluida `202610110007-training-invite-disconnect-cancellation`.

## E2E HTTP y base de datos

Comando: `PATH=/opt/homebrew/opt/node@22/bin:$PATH DB_HOST=127.0.0.1 DB_PORT=55432 DB_NAME=gymsheet_social_qa DB_USER=gym_sheet_writer DB_PASSWORD=temporary_local_qa DB_SSL=false yarn jest --config ./test/jest-e2e.json --runInBand test/social/entrenar-juntos.e2e-spec.ts`

Salida literal resumida de Jest (la suite también imprime un error forzado por la prueba de rollback M3):

```text
PASS test/social/entrenar-juntos.e2e-spec.ts
  H10 training invitations (PostgreSQL e2e)
    ✓ H10.S1.M3: acceptance atomically creates one meeting and visible chat event (723 ms)
    ✓ H10.S1.M4 appends one idempotent counterproposal and rejects accepting a stale revision (617 ms)
    ✓ H10.S1.M5 expires a pending invite when its current start time has passed (405 ms)
    ✓ H10.S1.M6 cancels future accepted meetings and revokes chat access on disconnect (624 ms)

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
Snapshots:   0 total
Time:        4.476 s, estimated 5 s
Ran all test suites matching /test\/social\/entrenar-juntos.e2e-spec.ts/i.
Done in 5.10s.
```

## Unitarias, tipos y lint

Comando: `PATH=/opt/homebrew/opt/node@22/bin:$PATH yarn jest --runInBand src/modules/training-invitations/calendar.service.spec.ts src/modules/training-invitations/training-invitations.service.spec.ts src/modules/social/social-revocation.repository.spec.ts`

```text
PASS src/modules/training-invitations/calendar.service.spec.ts
PASS src/modules/training-invitations/training-invitations.service.spec.ts
PASS src/modules/social/social-revocation.repository.spec.ts

Test Suites: 3 passed, 3 total
Tests:       10 passed, 10 total
Snapshots:   0 total
Time:        1.472 s, estimated 2 s
Ran all test suites matching /src\/modules\/training-invitations\/calendar.service.spec.ts|src\/modules\/training-invitations\/training-invitations.service.spec.ts|src\/modules\/social\/social-revocation.repository.spec.ts/i.
Done in 2.03s.
```

```text
$ tsc --noEmit
Done in 1.54s.
```

```text
$ eslint src/modules/training-invitations/calendar.service.ts src/modules/training-invitations/calendar.service.spec.ts src/modules/training-invitations/training-invitations.controller.ts src/modules/training-invitations/training-invitations.module.ts test/social/entrenar-juntos.e2e-spec.ts
Done in 2.56s.
```

## Limpieza de fixtures

Salida literal de consultas `count(*)` en la base QA después de E2E:

```text
migrations=85
qa_users=0
qa_invites=0
qa_meetings=0
qa_chat_events=0
```

## Revisión final de cancelación

La exportación cancelada usa `METHOD:CANCEL`, `STATUS:CANCELLED` y un `SEQUENCE` mayor con el mismo UID. Tras ese ajuste se repitieron los gates con Node 22 y el mismo PostgreSQL temporal: E2E H10 **4/4 PASS**, `calendar.service.spec.ts` **3/3 PASS** y `yarn type-check` **PASS**. La suite E2E volvió a emitir el error deliberado `forced H10 M3 rollback` y terminó en PASS. Se detuvo el servidor temporal con `pg_ctl stop -m fast` y se eliminó únicamente su directorio `/tmp/gymsheet-h10-ics-qa.js6VcV`; el puerto QA quedó libre.
