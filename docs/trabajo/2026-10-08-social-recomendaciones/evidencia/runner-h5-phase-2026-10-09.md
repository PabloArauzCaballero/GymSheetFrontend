# Registro PAIR de H5 — 2026-10-09

Esta captura corresponde al estado inicial del registro, antes de agregar el primer driver web H5. La corrida vigente está documentada en [H5.S1.M1 A_WEB](h5-s1-m1-web-driver-2026-10-09.md).

El runner acepta `--phase H5` y emite los ocho casos obligatorios. H5.S1.M1–M4 declaran un rol web; H5.S2.M1–M3 declaran Android, iOS y web para A; H5.S2.M4 declara Android para A, iOS para B y web para ambos. El caso M4 usa un barrier de invocación para coordinar las decisiones simultáneas.

Las aserciones registradas son `discoveryContractErrorRecoverable`, `discoveryEmptyExplained`, `swipeConflictReconciled`, `expiredCursorRestarted`, `keyboardSwipeMatchesGesture`, `filtersRefreshDeck`, `flexibleRangeDisclosed` y `simultaneousMatchOpensChat`, en orden de H5.S1.M1 a H5.S2.M4.

El registro inicial exigía `connectionNotDuplicated` para S1.M3 y `persistentDecisionsPreserved` para S1.M4. La revisión de alcance determinó que los drivers controlados no prueban una carrera 409 ni escrituras reales; el contrato actual usa `connectionSnapshotUnchanged` (M3) y `swipeWasIntercepted` (M4), que describen lo observado sin alegar persistencia. La garantía real de no duplicación y de decisiones persistidas sigue pendiente. También se exigen `returnToPreferredRangeAvailable` (cada rol S2.M3), y `oneCelebrationPerClient` + `chatAccessible` (cada rol S2.M4). El runner registra únicamente las claves que cada driver reportó; la evidencia visual/API depende de la verificación real de cada driver.

```text
$ QA_RUN_ID=h5-registration-2026-10-09 python3 scripts/qa/run-social-pair.py --phase H5
BLOCKED runId=h5-registration-2026-10-09 manifest=.../scripts/qa/evidence/runs/h5-registration-2026-10-09/manifest.json cases=8
exit 2
```

El manifiesto muestra los ocho casos en `BLOCKED`, cada uno por sus drivers de rol faltantes; no incluye tokens ni evidencia inventada. Este resultado confirma enumeración/preflight, no aceptación funcional ni ejecución en Android/iOS/web. Contratos del runner: 40/40 PASS (`python3 -m unittest scripts/qa/test_run_social_pair.py`).
