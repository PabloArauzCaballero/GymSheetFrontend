# Plan de prueba — social, recomendaciones y mapa

Objetivo: demostrar R01–R37 con persistencia y acciones simultáneas de usuarios distintos. Alcance: fases H1–H12. Fuera de alcance de esta entrega documental: ejecución funcional, contratación de proveedores, datos de producción, pruebas masivas sobre servicios externos y publicación.

## Niveles y datos

| Nivel | Qué valida | Entorno |
|---|---|---|
| Unitario | Afinidad, edad, reloj, recibos, máquinas de estado y normalización | Clock fijo/fixtures; no se llama E2E. |
| Integración SQL | Constraints, transacciones, migraciones y aislamiento | PostgreSQL real de QA. |
| API | Autenticación, ownership, filtros, concurrencia, media | Backend real con BD/almacenamiento QA. |
| Servicio motor | Contrato interno, proyección, fallback, evaluación | R propio + B; no stub en recorrido final. |
| Web E2E | Dos contextos, BFF/cookies, interacción y recarga | Playwright real, API activa; sin interceptar para fabricar éxito. |
| Móvil | Permisos nativos, grabación/reproducción, mapa y sesiones | Android AVD + iOS Simulator simultáneos, build identificado. |
| Integración externa | Directorio real y entrega push/calendario disponible | Entorno dedicado; si no se puede, BLOCKED explícito. |
| Manual | UX, accesibilidad asistida y doble revisión visual | Capturas finales, no screenshots de código. |

Fixtures completos en [DATOS_DE_PRUEBA.md](DATOS_DE_PRUEBA.md). Todos los casos dirigidos con IDs en [TRAZABILIDAD.md](TRAZABILIDAD.md); cada fila del plan describe dado/cuando/entonces y comando futuro.

## Matriz de riesgos y pruebas mínimas

| Riesgo | Caso principal | Aserción decisiva |
|---|---|---|
| Menor entra por URL directa | H2.S1.M2 | 17 rechazado en API; cumplir 18 cambia elegibilidad. |
| Cross-gym abre datos de negocio | H3.S1.M2 | Membresía/asistencia ajena inaccesible aun conectado. |
| Likes simultáneos duplican conexión | H3.S1.M3 | Constraint/consulta devuelve una sola pareja activa. |
| Recomendador devuelve prohibidos | H4.S2.M1/M2, H4.S4.M1 | Género/edad/bloqueo conservados con proyección vieja. |
| Cold start inventa atributos | H4.S2.M3/M4 | Motivos explicables solo desde features conocidas. |
| Aprendizaje toma no-exposición como rechazo | H4.S3.M1/M3 | Señales sin impresión no se convierten automáticamente en negativos. |
| Mapa permite reconstruir posición | H6.S1.M2 | Respuestas dependen de celda pública, no punto exacto. |
| Cambiar ciudad escribe GPS ficticio | H6.S1.M4 | Antes/después de ubicación persistida son iguales. |
| Fuente externa caída parece cero gyms | H6.S2.M4 | Se indica falla/caché, no ausencia certificada. |
| El visto reaparece retroactivamente | H7.S3.M5 | m1 nunca recibe leído al activar tras leerlo. |
| Reloj cliente evade edición/borrado | H7.S2.M1/M4 | Límites medidos por reloj servidor, extremos inclusivos. |
| Desconectar conserva URL/media | H3.S3.M1/M2, H7.S2.M5 | Request nuevo a URL previa denegado. |
| Story fuera de audiencia por enlace | H8.S1.M2/M3 | Acceso directo y expirado denegados. |
| Repost multiplica original | H9.S2.M3/M4 | Una entidad original; borrar repost no borra video. |
| Archivo inválido o demasiado largo | H9.S1.M1/M4 | 90 permitido, 90.1 rechazado; contenido corrupto rechazado. |
| Video provoca leak/crash | H9.S3.M3, H12.S2.M2 | Un reproductor activo, memoria y sesión prolongada medidas. |
| Compartir sesión sustituye rutina | H10.S2.M2 | Programa de B permanece; solo snapshot de sesión accesible. |
| A gana XP por lo hecho por B | H10.S2.M3/M4 | Historial y XP individuales. |
| Notificación revive chat revocado | H11.S2.M2/M3 | Worker y enlace vuelven a autorizar. |

## Entrada a la corrida final

- [ ] H1 completado con A/B de tenants diferentes, manifest y base real.
- [ ] Builds instalados con API/medios/motor del mismo entorno.
- [ ] Pruebas dirigidas de H2–H11 pasan con casos encontrados, no suites vacías.
- [ ] Proveedor de gimnasios real disponible o bloqueo explícito que impide cerrar R36.
- [ ] Flags/documentos/modelos versionados; teléfonos/emuladores sin sesión cruzada.

## Automatización y ejecución manual

Automatizar invariantes, API, concurrencia, fixtures, Playwright y recorridos móviles estables. Revisión visual, coherencia de copy, selección de fecha, calidad de audio y lectura asistida llevan observación humana del artefacto. Si una API nativa no está disponible en navegador, probar su alternativa documentada; no falsificar permiso concedido.

Títulos de tests contienen ID completo; H1 construye registro de casos para orquestador. `--case` inexistente devuelve error; `--phase` incompleta no permite PASS. Para requisitos con prueba manual guardar pasos, expected/actual, evidencia de ambas pantallas y query/response de persistencia.

## Formato de resultado por caso

```text
Caso: H7.S3.M5
RunId y versiones: valores reales de manifest
Entorno/actores: Android A, iOS B, gimnasios QA distintos
Comando o pasos: literales de la ejecución
Esperado: m1 sin visto retroactivo; m2 con visto si ambos lo permiten
Obtenido: registrar observación real, no copiar el esperado
Veredicto: PASS / FAIL / BLOCKED
Artefactos: rutas existentes a captura/video/API/BD
No cubierto: detallar limitación o indicar ninguna con alcance explícito
```

Salida final: cero casos obligatorios omitidos, cero defectos críticos/mayores, evidencia correspondiente al último cambio. Métricas de recomendación reales permanecen sin afirmar hasta existir muestra real; aprobar reglas sintéticas no equivale a demostrar calidad de afinidad poblacional.
