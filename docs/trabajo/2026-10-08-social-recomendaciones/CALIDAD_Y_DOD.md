# Calidad y Definition of Done

Adaptación de Alovida: criterio de aceptación describe qué observa el usuario; DoD identifica cómo se demuestra. Las métricas siguientes son objetivos propuestos para QA, no mediciones obtenidas.

## Escalera de evidencia y estados

Estado de tareas: `TODO`, `EN CURSO`, `HECHO`, `A MEDIAS`, `BLOQUEADO`, `DESCARTADO`. Una fila HECHO exige CA satisfecho, test dirigido, persistencia cuando corresponde, gates del área y enlace a evidencia de versión final. `WRITTEN`, `RUNS`, `TESTED`, `VERIFIED`, `REGRESSION_VERIFIED` describen evidencia, no sustituyen el estado.

Veredictos de prueba: PASS, FAIL, BLOCKED; SKIP solo para una superficie que realmente no aplica y con motivo. No usar SKIP para sustituir Android, proveedor externo no configurado o tests ausentes. No declarar E2E sin API y BD reales.

## Gates por área

| Cambio | DoD mínimo |
|---|---|
| Regla pura/score | Test dirigido de límites, campos faltantes, valores inválidos; fixture reproducible. |
| API y autorización | Positivo, actor ajeno, estado revocado, tenant distinto; status, respuesta y efecto real en BD. |
| Migración | Base vacía y esquema anterior sintético; backfill, constraints, índices, compatibilidad y recuperación por flags. |
| UI | Interacción real, recarga, API persistida, consola/red revisadas, captura y accesibilidad. |
| Eventos/socket | Duplicados, desorden, reconexión, revocación entre enqueue y entrega. |
| Media | Tipo real, límites, corte/reintento, ciclo de reproducción y revocación de URL. |
| Proveedor | Prueba autenticada real cuando corresponda, procedencia, atribución y comportamiento de fallo. Fixture no acredita integración. |
| Cierre | Dirigidos + regresión afectada + matriz de tres plataformas + reporte sin defectos críticos/mayores abiertos. |

## Comandos existentes observados

Desde frontend, usando Node compatible:

```sh
yarn turbo run source-check type-check lint test --filter=!@gymsheet/mobile
yarn workspace @gymsheet/web build
yarn workspace @gymsheet/mobile type-check
yarn workspace @gymsheet/mobile lint
yarn workspace @gymsheet/mobile test:stories
yarn workspace @gymsheet/mobile test:tour
```

Desde backend:

```sh
yarn type-check
yarn lint
yarn test
yarn test:e2e
yarn build
```

Para una fila backend nueva, Jest e2e tiene rootDir `..` y regex `.e2e-spec.ts$`; se podrá dirigir a `test/social/<fase>.e2e-spec.ts`. Tests futuros nombran literalmente el ID completo. No dar por aprobado un `-t` que encontró cero pruebas. El script móvil actual contiene `--passWithNoTests`; eso no es suficiente como gate social: se exige conteo positivo y casos identificados.

No correr todas las suites durante redacción documental: no hay código de producto cambiado. Estos comandos son el protocolo de implementación. Si una regresión previa falla, registrar baseline y no ocultarla; puede bloquear aceptación del recorrido que la necesite.

## Presupuestos medibles iniciales

Entorno de referencia: dataset 10.000 perfiles sintéticos, 20 solicitudes concurrentes, calentamiento 60 s, medición 5 min; registrar hardware, recursos asignados y red. Son objetivos del plan; modificar requiere justificación escrita, no cambiar umbral para ocultar un fallo.

| Métrica | Objetivo inicial | Medición |
|---|---|---|
| API de baraja/mapa desde backend caliente | p95 ≤800 ms, errores inesperados <1% | Latencia de request, sin incluir descarga de tiles; contar fallback. |
| Ranking interno | p95 ≤200 ms; timeout 300 ms | spans de servicio; prueba de fallo separado. |
| Propagación de mensaje entre actores foreground | p95 ≤2 s en LAN QA | persistido→visible, 100 mensajes. |
| Proyección del recomendador | p95 ≤5 s | emittedAt→appliedAt; sin sacrificar filtro final. |
| Primer video visible con red controlada | p95 ≤3 s a 10 Mbps/100 ms RTT | 30 aperturas con caché declarada. |
| Scroll de reels/memoria | 30 min, 100 videos, cero crash | Memoria estabilizada: mediana final no supera 1.2× mediana tras calentamiento; registrar límites absolutos de dispositivo. |
| Reproductores simultáneos | 1 | Instrumentación y observación de audio/foco. |
| Exclusiones y privacidad | 0 violaciones | Matriz negativa; no hay tolerancia porcentual. |

Si emulación no permite validar rendimiento representativo, registrar resultado de emulador y añadir corrida en dispositivo físico como validación de rendimiento; no extrapolar al teléfono del usuario. No sustituye el requisito funcional en emuladores.

## Accesibilidad y revisión visual

Mantener dirección Apple-like y tokens existentes, sin rediseño ajeno. Web: 360/390 px móvil, 768 tablet, 1440 escritorio. Móvil: dispositivo pequeño y uno grande cuando cambie layout; orientación admitida, teclado abierto, texto aumentado, temas que el producto soporte y movimiento reducido. Confirmar tema oscuro actual de app; no inventar soporte claro nativo si no existe, y registrar cobertura por plataforma.

Pantallas: activación, preferencias, perfil, Conocer, solicitudes, mapa/lista/ficha, chat/menú/visto, story/audiencia, crear reel/feed/comentarios, invitación/agenda, privacidad y moderación web. Estados carga/vacío/error/éxito en las superficies con comportamiento distinto.

Cada captura se abre y revisa dos veces: primera contra CA; segunda adversarial sobre recortes, contraste, foco, jerarquía, coherencia, estados y datos privados. Reportar severidad BLOQUEANTE/MAYOR/MENOR y nota RECHAZADA/ACEPTABLE CON RESERVAS/APROBADA. Corrección exige recapturar misma celda y repetir ambas pasadas. No entregar pantalla RECHAZADA como terminada.

## DoD del programa

- R01–R37 trazados a casos con resultados; todas las fases tienen evidencia real.
- Recorridos QA-AB-01 a QA-AB-08 completados con roles, gimnasios y versiones declarados.
- Cero defectos de autorización, filtrado obligatorio, revocación o persistencia.
- Cero defectos críticos/mayores abiertos de UX; menores documentados con alcance.
- Regresión de rutinas/workouts/progresión/autenticación/admin afectada en verde.
- Reporte lista verificaciones ejecutadas y lo no cubierto, con links a artefactos reales. Planificar estas pruebas no las marca cumplidas.
