# H10 — Entrenar juntos respeta la rutina de cada persona

> **For agentic workers:** REQUIRED SUB-SKILL: usar `superpowers:executing-plans` para ejecución directa; `superpowers:subagent-driven-development` solo si se elige ese método. Ejecutar microtareas con casillas, conservar trabajo previo y no marcar HECHO sin evidencia.

**Goal:** A/B acuerdan un encuentro y registran progresos independientes.

**Architecture:** entrega vertical sobre contratos comunes; backend autoriza, clientes reflejan estado persistente.

**Tech Stack:** stack existente documentado; R separado cuando aplica.

**Spec:** [Especificación](../ESPECIFICACION.md) y [contratos](../ARQUITECTURA_Y_CONTRATOS.md).

**Requisitos:** R13, R14, R15, R21. **Dependencias:** H3, H7. **Estado:** EN CURSO.

## Restricciones globales

Aplican íntegramente R01–R37, el aislamiento de datos privados, 18+, filtros obligatorios, revocación de chat y evidencia real. No modificar otros worktrees ni reutilizar evidencia de otro commit.

**CA del hito:** Dado el entorno de prueba y sus dependencias, cuando se ejecutan sus casos, entonces a/B acuerdan un encuentro y registran progresos independientes.

**DoD del hito:** cada fila en PASS con su salida literal y [gates](../CALIDAD_Y_DOD.md), recorrido visible del hito en Android/iOS/web; `python3 scripts/qa/run-social-pair.py --phase H10` genera manifest sin casos obligatorios omitidos. Comando por implementar en H1.

## Foco de revisión

1. Sesión o caché anterior: no mezclar usuario ni preferencias.
2. Mutación simultánea: mismo resultado persistente sin duplicados.
3. Conexión revocada entre lectura y acción: autorización al ejecutar.
4. Permiso/red/proveedor ausente: recuperación explícita sin datos ficticios.
5. Recurso de otro gimnasio: acceso social mínimo, sin abrir datos privados.

Los casos negativos de cada grupo y H12 ejercitan estos cinco riesgos; no se consideran una revisión ejecutada.

## H10.S1 — Invitación y revisiones

**Archivos:** `B/src/modules/training-invitations/ (nuevo)`; `B/src/modules/training/training.service.ts (integración)`; `B/src/modules/workouts/workouts.service.ts (integración)`. **Pruebas nuevas:** `B/test/social/entrenar-juntos.e2e-spec.ts`.

**Interfaces:** Produce TrainingInviteInput y respondInvite(inviteId,expectedRevision,decision).

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** EN CURSO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID  | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
| --- | ------------------ | ---------------------------- | ------------ | ------ |

| H10.S1.M1 | [x] Restringir a conexiones | Dado A/C no conectados; cuando A invita C; entonces rechazo sin evento en agenda. | PostgreSQL E2E `-t 'H10.S1.M1'` → PASS: no conectado y bloqueado reciben 403; cero invitaciones/revisiones para el destinatario rechazado; conexión aceptada y no bloqueada requerida. Evidencia: [H10.S1.M1/M2](../evidencia/h10-s1-m1-m2-backend-2026-10-11.md) | HECHO |

| H10.S1.M2 | [x] Crear invitación puntual | Dado A/B conectados; cuando A propone sesión propia en lugar público; entonces B recibe fecha hora zona y modo. | PostgreSQL E2E `-t 'H10.S1.M2'` → PASS: persiste una invitación y su primera revisión con `PUBLIC_PLACE`, fecha UTC, zona, duración y modo; replay idéntico devuelve el mismo ID y cambios devuelven 409. Evidencia: [H10.S1.M1/M2](../evidencia/h10-s1-m1-m2-backend-2026-10-11.md) | HECHO |

| H10.S1.M3 | [x] Aceptar una sola revisión | Dado B acepta dos veces; cuando llegan solicitudes concurrentes; entonces un encuentro con dos participantes y un evento de chat. | PostgreSQL E2E `-t 'H10.S1.M3'` PASS 1/1; regresión `-t 'H10.S1'` PASS 2/2. Verifica creación atómica de encuentro, conversación directa con dos participantes y evento `TRAINING_INVITE_ACCEPTED`; ambos bearers leen `type=system`, `senderId=null` y la revisión/lugar/fecha esperados. Replay concurrente produce una sola aceptación, encuentro y evento; fallo forzado del evento revierte estado, comando, encuentro, evento y conversación. Type-check y ESLint focal pasan; cleanup QA: cero usuarios sintéticos y cero huérfanos. Evidencia: [aceptación completa](../evidencia/h10-s1-m3-aceptacion-completa-2026-10-11.md) | HECHO |

| H10.S1.M4 | [x] Contraproponer horario | Dado B propone revisión 2; cuando A intenta aceptar revisión 1; entonces 409 y UI obtiene revisión vigente. | PostgreSQL E2E `-t 'H10.S1.M4'` PASS: doble contrapropuesta concurrente produce 1 revisión y 1 comando; replay idéntico es idempotente, clave igual con payload distinto devuelve 409, revisión 1 stale devuelve 409 y A acepta revisión 2. E2E del módulo 2/2; type-check, schema unit 6/6, ESLint/Prettier focal PASS; cleanup verificado en cero. Evidencia: [H10.S1.M4](../evidencia/h10-s1-m4-contrapropuesta-2026-10-11.md) | HECHO |

| H10.S1.M5 | [x] Vencer invitación pendiente | Dado comienzo ya pasó; cuando intenta aceptar; entonces queda expirada sin agenda futura. | PostgreSQL E2E `-t 'H10.S1.M5'` PASS 1/1; el intento y replay devuelven 409 tras persistir `EXPIRED` + un comando; una clave nueva también devuelve 409. SQL confirma cero meeting/event y campos de aceptación vacíos. Migración 006, type-check, ESLint/Prettier focal y limpieza QA PASS. Evidencia: [H10.S1.M5](../evidencia/h10-s1-m5-expiracion-2026-10-11.md) | HECHO |

| H10.S1.M6 | [x] Cancelar tras desconexión | Dado encuentro aceptado futuro; cuando A desconecta B; entonces ambas agendas muestran cancelación sin chat accesible. | PostgreSQL E2E H10 4/4 PASS: cancela reunión futura y propuesta pendiente, conserva respuesta histórica, ambas agendas muestran cancelación, tercero ve lista vacía y chat revocado responde 404. [Evidencia](../evidencia/backend-h10-s1-m6-qa-2026-10-12.md). | HECHO (backend) |

## H10.S2 — Sesiones independientes

**Archivos:** `B/src/modules/training-invitations/shared-session.service.ts (nuevo)`; `B/src/modules/workouts/ (integración mínima)`; `B/src/modules/progression/ (reutilizar cálculo)`. **Pruebas nuevas:** `B/test/social/entrenar-juntos.e2e-spec.ts`.

**Interfaces:** Produce snapshot de sesión compartida y vínculo inviteId→workoutId por participante.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** EN CURSO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID  | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
| --- | ------------------ | ---------------------------- | ------------ | ------ |

| H10.S2.M1 | [x] Mantener rutinas propias | Dado modo OWN_ROUTINES; cuando ambos inician encuentro; entonces cada uno abre su propia sesión. | PostgreSQL E2E H10 8/8: cada usuario mantiene su rutina, identificador de rutina y sesión separados; Web 21/21 y móvil 11/11 cubren la selección de modo. [Cierre](../evidencia/h10-cierre-funcional-2026-10-12.md) · [backend](../evidencia/backend-h10-s2-s4-qa-2026-10-12.md). | HECHO (backend + clientes automatizados) |

| H10.S2.M2 | [x] Compartir solo una sesión | Dado modo SHARED_SESSION; cuando B acepta; entonces B accede al snapshot acordado sin reemplazar rutina completa. | PostgreSQL E2E H10 8/8: snapshot acordado congelado, sin pesos/notas privadas; B lo consulta y tercero recibe 404. Web 21/21 y móvil 11/11 validan selector, contrato y visualización segura. [Cierre](../evidencia/h10-cierre-funcional-2026-10-12.md) · [backend](../evidencia/backend-h10-s2-s4-qa-2026-10-12.md). | HECHO (backend + clientes automatizados) |

| H10.S2.M3 | [x] Registrar pesos personales | Dado A usa 40 kg y B 20 kg; cuando guardan serie; entonces cada historial conserva su valor. | PostgreSQL E2E H10 8/8 guarda pesos distintos y verifica cada historial por propietario, sin compartirlos en el snapshot. [Cierre](../evidencia/h10-cierre-funcional-2026-10-12.md) · [backend](../evidencia/backend-h10-s2-s4-qa-2026-10-12.md). | HECHO (backend) |

| H10.S2.M4 | [x] Asignar XP individual | Dado A completa y B no; cuando se calcula progreso; entonces solo A recibe recompensa correspondiente. | PostgreSQL E2E H10 8/8 finaliza sesión de A y comprueba XP/progreso solo para A; B conserva estado propio. [Cierre](../evidencia/h10-cierre-funcional-2026-10-12.md) · [backend](../evidencia/backend-h10-s2-s4-qa-2026-10-12.md). | HECHO (backend) |

| H10.S2.M5 | [x] Conservar entrenamiento terminado | Dado sesión de A completada; cuando se cancela encuentro; entonces historial de A permanece. | PostgreSQL E2E H10 8/8 cancela el encuentro después de finalizar A y verifica que sesión, series, historial y progreso no se borran. [Cierre](../evidencia/h10-cierre-funcional-2026-10-12.md) · [backend](../evidencia/backend-h10-s2-s4-qa-2026-10-12.md). | HECHO (backend) |

## H10.S3 — Agenda y calendario

**Archivos:** `F/apps/mobile/src/features/training-invitations/ (nuevo)`; `F/apps/web/src/features/training-invitations/ (nuevo)`; `B/src/modules/training-invitations/calendar.service.ts (nuevo)`. **Pruebas nuevas:** `F/apps/mobile/.maestro/social/<ID>.yaml + F/apps/web/e2e/social/entrenar-juntos.spec.ts`.

**Interfaces:** Produce agenda interna y evento ICS/native con UID estable; sin sincronización bidireccional.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** EN CURSO.

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID  | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
| --- | ------------------ | ---------------------------- | ------------ | ------ |

| H10.S3.M1 | [ ] Coordinar por chat y perfil | Dado conexión aceptada; cuando A abre Entrenemos juntos desde ambos accesos; entonces mismo formulario y reglas. | Parcial: perfil y chat comparten el formulario web/móvil; contratos, validación, type-check, ESLint focal y API local funcionan. Falta recorrer ambos accesos y clientes en PAIR. El runner registra H10; preflight 18/18 BLOCKED por falta de roles/dispositivos. Evidencia: [web](../evidencia/h10-s3-m1-web-2026-10-11.md), [móvil](../evidencia/h10-s3-m1-mobile-2026-10-11.md), [cierre local](../evidencia/h10-cierre-funcional-2026-10-12.md) | EN CURSO |

| H10.S3.M2 | [ ] Mostrar horario local correcto | Dado A/B en zonas diferentes; cuando aceptan una misma hora UTC; entonces cada agenda presenta su hora local correspondiente. | Web y móvil muestran `startsAt` en la zona local de cada cliente y tienen pruebas focales; falta PAIR con dos zonas y manifiesto. [Web](../evidencia/h10-agenda-web-2026-10-12.md) · [Móvil](../evidencia/h10-agenda-mobile-2026-10-12.md). | EN CURSO |

| H10.S3.M3 | [ ] Exportar sin duplicar | Dado encuentro ya exportado; cuando usuario repite exportación; entonces mantiene UID y ofrece actualizar en lugar de crear copia silenciosa. | Backend emite ICS autenticado con UID estable por invitación/usuario y `SEQUENCE` mayor al cancelar; Web y móvil ofrecen descarga/compartir y explican reimportación manual. Driver Web local PASS: descargó dos veces el archivo y comprobó UID estable; evidencia [cierre local](../evidencia/h10-cierre-funcional-2026-10-12.md) y [captura](../evidencia/h10-s3-m3-web-local-2026-10-12.png). Build e inicio de sesión iOS PASS en simulador con cuenta desechable; la verificación de compartir ICS quedó bloqueada cuando CoreSimulatorService dejó de responder a `simctl`. Falta PAIR iOS y actualización/importación en calendario externo; Android compiló, sin recorrido UI. [Backend](../evidencia/backend-h10-s3-m3-calendar-2026-10-12.md) · [clientes](../evidencia/h10-s3-m3-calendar-clients-2026-10-12.md) · [drivers](../evidencia/h10-s3-m3-pair-drivers-2026-10-12.md). | EN CURSO |

| H10.S3.M4 | [ ] Continuar sin permiso de calendario | Dado permiso denegado; cuando acepta encuentro; entonces agenda interna funciona y exportación explica alternativa. | Web/móvil muestran agenda independiente del permiso y alternativa de importación manual; tests de invitaciones 17/17 web y 10/10 móvil PASS. Falta PAIR con permiso denegado. [Evidencia](../evidencia/h10-s3-m4-m5-agenda-map-2026-10-12.md) | EN CURSO |

| H10.S3.M5 | [ ] Abrir lugar correcto | Dado gimnasio o parque acordado; cuando toca ubicación; entonces navegación usa el lugar elegido sin prometer reserva. | Web y móvil abren búsqueda de Maps usando el `placeLabel` confirmado; la prueba web comprueba URL y móvil prueba el URL helper; no se prometen coordenadas ni reserva. 17/17 web y 10/10 móvil en suites de invitaciones; falta comprobar la apertura del destino en dispositivo. [Evidencia](../evidencia/h10-s3-m4-m5-agenda-map-2026-10-12.md) | EN CURSO |

## H10.S4 — Compatibilidad y recuperación de datos

**Archivos:** `B/src/database/migrations/ (nueva migración del módulo; ID secuencial disponible)`; `B/test/social/entrenar-juntos.e2e-spec.ts (nuevo)`. **Pruebas nuevas:** `B/test/social/entrenar-juntos.e2e-spec.ts`.

**Interfaces:** Consume esquema anterior sintético; produce migración expand/contract compatible. Ejecutar esta subtarea antes de mutaciones que dependan de tablas nuevas, conservando numeración estable.

**CA:** dadas las precondiciones de cada fila, al ejecutar sus acciones se cumplen exactamente sus resultados. **DoD:** todos los comandos dirigidos de este grupo devuelven PASS y no hay defectos mayores abiertos. **Estado:** HECHO (backend; falta aceptación H10 integral).

**Secuencia por microtarea:**

- [ ] Añadir prueba con ID y aserciones literales de la fila.
- [ ] Ejecutar la prueba; registrar fallo por comportamiento ausente, diferenciándolo de entorno roto.
- [ ] Implementar el cambio mínimo en los archivos del grupo; actualizar contrato/migración si esa fila lo requiere.
- [ ] Ejecutar DoD dirigido; guardar salida y evidencia del estado persistente.
- [ ] Aplicar gates del área; revisar diff; preparar commit acotado sin incluir cambios ajenos.

| ID  | Cambio verificable | CA: dado / cuando / entonces | DoD dirigido | Estado |
| --- | ------------------ | ---------------------------- | ------------ | ------ |

| H10.S4.M1 | [x] Aplicar esquema sin pérdida | Dado datos sintéticos del esquema anterior; cuando se aplica la migración del módulo; entonces registros previos permanecen y constraints nuevos rechazan estados inválidos. | PostgreSQL aislado: conserva usuarios/historias y comprueba constraints nuevos; PASS. Incluido en H10 E2E 7/7. Evidencia: [backend H10.S2/S4](../evidencia/backend-h10-s2-s4-qa-2026-10-12.md). | HECHO |

| H10.S4.M2 | [x] Reabrir desde base vacía | Dado base QA nueva; cuando se aplican todas las migraciones hasta este módulo; entonces se puede cargar fixture del módulo sin intervención manual. | PostgreSQL `template0`: registry completa incluida migración 008, fixture de invitación válido y rollback protegido; PASS. Incluido en H10 E2E 7/7. Evidencia: [backend H10.S2/S4](../evidencia/backend-h10-s2-s4-qa-2026-10-12.md). | HECHO |

## Salida del hito

Actualizar [trazabilidad](../TRAZABILIDAD.md) y [reporte](../REPORTE.md). Repetir [LOOP](../LOOP.md) por defecto reproducible; un bloqueo externo se documenta con evidencia y no habilita las tareas que dependen de él. Los tests y runners indicados en este archivo son trabajo futuro, no herramientas cuya existencia se afirme hoy.
