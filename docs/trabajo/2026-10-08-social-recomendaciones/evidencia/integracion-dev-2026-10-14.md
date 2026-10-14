# Integración con `dev` — 2026-10-14

Se actualizó `origin/dev` y se analizó el árbol combinado sin modificar ramas ni worktrees:

- `origin/dev`: `52d7d87`; rama social remota antes de este avance: `e1a4993`; avance de esta sesión: `9ab7643`.
- `git rev-list --left-right --count origin/dev...HEAD`: 222 commits solo en `dev` y 29 solo en la rama social.
- `git merge-tree --write-tree origin/dev HEAD`: 49 conflictos en rutas. Afectan navegación y paquetes móviles, chat/moderación web, contratos social/training/workouts y `yarn.lock`; también hay rutas de ejercicios/workout eliminadas en `dev` y modificadas en la rama social.
- `origin/dev` no contiene `scripts/qa/run-social-pair.py`, sus pruebas ni los documentos de este plan H11.

No se creó un merge commit ni se resolvieron conflictos de paquetes ajenos a este cambio. La rama social publicada contiene el registro H11 completo y su preflight. Para integrar el plan entero hace falta reconciliar los cambios de la rama social con la estructura actual de `dev` y ejecutar sus gates; el merge automático no es seguro.

## Actualización — 2026-10-14

La revisión inicial de arriba fue superada por integraciones parciales validadas:

- Backend: merge social/recomendaciones publicado en `GymSheetBackend/dev` como `2785862`. Type-check, ESLint y 153 suites unitarias (1.294 pruebas) pasaron con variables locales ficticias. Las pruebas que exigen PostgreSQL real quedaron omitidas (`SKIP_DB_INTEGRATION_TESTS=1`); no se ejecutaron migraciones en una BD QA.
- Frontend: el merge SDK57 del mapa/media ya está en `dev` como `1e76f6c`; luego entró PR #32 y el remoto avanzó a `abf598f`. Este cambio incorpora el plan social completo como documentación, runner y evidencia, sin llevar el árbol completo de UI social a `dev`. `scripts/qa/test_run_social_pair.py` pasó 58/58; el validador registró 197 casos trazados, 37 requisitos y 0 enlaces rotos.
- El preflight H11 sigue bloqueado por API QA, roles/drivers y dispositivos disponibles; no se generó evidencia PAIR. El merge de documentación/runner no cierra H11 ni H1–H12.
