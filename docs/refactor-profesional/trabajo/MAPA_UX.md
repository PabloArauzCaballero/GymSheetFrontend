# Mapa UX — Fase 02 (arquitectura de información)

> Consume INVENTARIO.md y HALLAZGOS.md. La navegación real de GymSheet (`nav-config.ts`) ya está
> organizada por tarea y por audiencia, con razones documentadas inline por el equipo que la
> construyó — esta fase audita esa base real, no propone una taxonomía genérica de SaaS desde cero.

## Navegación actual — ya es "tres audiencias", no una lista plana

`primaryNavigation` (miembro), `adminNavigation` (personal de un gimnasio) y `systemNavigation`
(plataforma) están correctamente separadas por quién las usa y qué decide cada una, gateadas por
rol + permiso granular vía `canSee()`. Varias decisiones de orden ya están razonadas en el código
(ver INVENTARIO.md): "Tu senda" pegada al panel, "Interacciones" pegada a Comunidad por el badge
numérico, "Descubrir" como destino propio. **Veredicto: la estructura de tres niveles no necesita
reorganizarse — es sólida.** El trabajo de esta fase es más fino: qué aparece en cada una y en qué
orden dentro de cada contexto específico, no la taxonomía general.

## Tareas candidatas recorridas (F00.3 / F01.2)

| Tarea | Ruta | Estado del recorrido |
|---|---|---|
| Principal (entrenar) | `/workouts`, `/workouts/new` | Estático + capturas desktop/375px. Empty state claro ("Sin entrenamientos registrados", CTA "Iniciar primera sesión"). No se completó un entrenamiento de punta a punta con escritura real — pendiente para fase 06. |
| Frecuente (comunidad/descubrir) | `/comunidad`, `/descubrir` | Cargan, buscador y "Podio del gimnasio" visibles. Lista poblada casi enteramente por datos de QA (`Smoke...`, `Visual...`) — no sirve para evaluar densidad real de contenido. |
| Recuperación/edición | — | No completado en esta pasada (recuperar contraseña, editar ejercicio propio) — pendiente. |

## Hallazgos de IA de esta fase

### N01 — El dashboard no distingue "socio" de "personal" para el aviso de membresía (H03)

Ver HALLAZGOS.md § H03. Decisión pendiente de producto, no aplicada: ¿el aviso de membresía
vencida debe condicionarse o suavizarse cuando la cuenta también tiene rol de personal? Impacto
bajo (cosmético/tono, no bloquea ninguna tarea — el CTA operativo sigue visible en el encabezado).
**No se propone una fecha de resolución obligatoria**; queda en el backlog de fase 02 para cuando
haya capacidad de decidirlo con el dueño de producto, porque cambia una decisión ya documentada y
deliberadamente consistente con el móvil.

### N02 — El tour de onboarding no diferencia audiencia (relacionado con H02)

El copy del tour ("te mostraremos cómo moverte por GymSheet... entrenamiento, progreso...") está
escrito para un socio. Se reprodujo también para `SYSTEM_ADMIN` y `ADMIN`, cuyo primer contacto
con el producto probablemente no es "aprender a registrar un entrenamiento". Candidato: el motor
de tutoriales (`features/tutorials/engine`) ya soporta registrar tutoriales por id
(`TutorialRegistry`) — evaluar en fase 05/06 si corresponde un tutorial distinto (o ninguno) para
cuentas de personal, en vez de silenciarlo por completo (perderían la introducción a `/admin` y
`/sistema`, que si vale la pena mostrar).

### N03 — Auditoría/Moderación/Permisos ahora son alcanzables, pero no tienen entrada consistente

Con H01 corregido, `/admin/auditoria`, `/admin/moderacion`, `/admin/permissions` y
`/sistema/auditoria` ya devuelven datos reales. `nav-config.ts` ya las lista correctamente. No se
propone ningún cambio de IA aquí — la estructura ya es correcta, solo estaba rota la conexión al
backend (ya resuelto).

## Qué NO se tocó en esta fase (honestidad de alcance)

No se reorganizó `nav-config.ts`: el análisis concluye que la estructura actual ya cumple el
criterio "ordena por tareas y modelo mental, no por organización interna del código" del
`PROMPT_MAESTRO.md`. Reorganizar navegación que ya está bien pensada, solo para justificar la
fase, iría contra la regla "no se mueve únicamente porque queda mejor" de `LEEME_PRIMERO.md`.
