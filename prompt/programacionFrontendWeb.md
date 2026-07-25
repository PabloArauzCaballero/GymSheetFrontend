# Prompt frontend web de producción 10/10 — Next.js App Router

```yaml
prompt_version: 8.0.0
status: active
last_updated: 2026-07-15
framework: Next.js App Router
language: TypeScript
styling: Tailwind CSS
ui_primitives: shadcn/ui + Radix UI
default_locale: es-BO
package_manager: preserve-existing
```

Este documento define el estándar generalista para diseñar, migrar, implementar, integrar, probar y desplegar frontends web profesionales con Next.js App Router.

Debe aplicarse junto con:

```txt
prompt/index.md
prompt/programacionGeneral.md
prompt/programacionFrontendWeb.md
```

Cuando exista backend, también deben revisarse sus contratos OpenAPI, documentación de endpoints y endpoints especializados de lectura o picking.

---

# 00 — Objetivo, alcance y principios no negociables

## 1. Objetivo

Construir frontends web correctos, seguros, accesibles, mantenibles, rápidos, observables y verificables.

El resultado debe parecer parte de un producto real mantenido por un equipo profesional. No debe parecer:

- Un tutorial.
- Un prototipo visual.
- Una colección de páginas desconectadas.
- Un frontend basado únicamente en CRUD.
- Una aplicación que consume entidades completas para mostrar dos campos.
- Un sistema que aparenta estar congelado durante las transiciones.
- Un diseño llamativo pero difícil de operar.
- Una interfaz que oculta errores o permisos insuficientes.

## 2. Prioridades

Orden obligatorio:

1. Correctitud funcional.
2. Seguridad.
3. Accesibilidad.
4. Contratos de datos.
5. Claridad visual.
6. Rendimiento medido.
7. Mantenibilidad.
8. Observabilidad.
9. Escalabilidad.
10. Reutilización justificada.
11. Animación profesional al servicio de la comprensión.

## 3. KISS sin fragilidad

- No crear capas, wrappers o providers sin una responsabilidad real.
- No instalar librerías por moda.
- No duplicar librerías para estado, animaciones, formularios o componentes.
- No convertir todo en Client Component.
- No convertir todo en Server Component si la interacción lo impide.
- No crear componentes genéricos que oculten reglas del dominio.
- No usar animaciones para compensar una navegación lenta.
- No hacer una reescritura visual si el usuario pidió conservar las vistas.
- No generalizar antes de observar repetición semántica real.

## 4. Regla de archivos

Todo archivo manual de código debe permanecer por debajo de 300 líneas.

Política:

- Advertencia desde 220 líneas.
- Revisión de cohesión desde 260 líneas.
- Prohibición desde 300 líneas.

Excepciones:

- Archivos generados.
- Catálogos declarativos.
- Fixtures tabulares extensas.
- Especificaciones OpenAPI generadas.
- Traducciones generadas.

Toda excepción debe registrarse en `docs/progress/progress-report.md`.

## 5. Evidencia

No afirmar:

- “Compila”.
- “Pasa pruebas”.
- “Está listo para producción”.
- “Es accesible”.
- “Es responsive”.
- “No hace overfetch”.
- “Está optimizado”.
- “Es seguro”.

sin ejecutar y conservar evidencia verificable.

---

# 01 — Precedencia de fuentes y lectura obligatoria

## 1. Orden de lectura

Antes de modificar, migrar o implementar un frontend:

```txt
1. prompt/index.md
2. prompt/programacionGeneral.md
3. prompt/programacionFrontendWeb.md
4. Documento UI/UX aportado por el usuario
5. systemInfo/*
6. docs/architecture/*
7. docs/ui/*
8. docs/ui-ux/*
9. docs/endpoints/*
10. docs/contracts/*
11. docs/architecture/decisions/*
12. OpenAPI del backend
13. Documentación de endpoints de picking/proyección
14. Código y pruebas existentes
15. Diseños, capturas, Figma o Stitch aportados
```

## 2. Documento de buenas prácticas UI/UX

Si el usuario aporta un documento de buenas prácticas UI/UX:

- Debe leerse completo antes de diseñar o modificar vistas.
- Deben extraerse reglas verificables, no solo recomendaciones vagas.
- Debe generarse una matriz de trazabilidad:

```txt
Regla UI/UX
→ componente o vista afectada
→ decisión tomada
→ prueba o criterio de aceptación
```

Archivo obligatorio:

```txt
docs/ui/ui-ux-source-traceability.md
```

## 3. Si el documento UI/UX no está disponible

- Buscarlo en archivos entregados y documentación del proyecto.
- No afirmar que fue revisado si no se encontró.
- Registrar el faltante.
- Continuar solo con lineamientos generales cuando la identidad visual o el flujo no dependan de información crítica.
- Pedir el documento si su ausencia impide preservar un diseño, marca o flujo obligatorio.

## 4. Contradicciones

Prioridad:

1. Reglas de negocio aprobadas.
2. Seguridad y privacidad.
3. Contrato OpenAPI vigente.
4. Documento UI/UX aprobado.
5. Diseños visuales aprobados.
6. Código existente.
7. Supuestos documentados.

Una captura no puede anular:

- Permisos.
- Accesibilidad.
- Validaciones.
- Estados de error.
- Requisitos de seguridad.
- Reglas de negocio.

---

# 02 — Perfil tecnológico Next.js

## 1. Versión

Usar una versión estable y soportada de Next.js App Router compatible con:

- React.
- Node.js.
- Librerías existentes.
- Plataforma de despliegue.
- Lockfile.

No actualizar de major automáticamente.

Toda migración de major requiere:

- Revisión de notas oficiales.
- ADR.
- Pruebas.
- Plan de rollback.

## 2. Stack base

Salvo decisión documentada:

- Next.js App Router.
- React.
- TypeScript estricto.
- Tailwind CSS.
- shadcn/ui y Radix UI para primitivas accesibles.
- Zod para validación runtime.
- React Hook Form para formularios complejos.
- TanStack Query cuando exista estado de servidor interactivo en cliente.
- TanStack Table para tablas complejas.
- Vitest.
- React Testing Library.
- MSW.
- Playwright.
- Axe.
- ESLint.
- Prettier.

## 3. Gestor de paquetes

- Conservar Yarn si el proyecto usa Yarn.
- Conservar pnpm si usa pnpm.
- Conservar npm si usa npm.
- No mezclar lockfiles.
- Instalar con lockfile congelado en CI.
- No cambiar el gestor sin ADR.

## 4. Librerías

Crear:

```txt
docs/architecture/library-selection.md
```

Registrar para cada dependencia relevante:

- Responsabilidad.
- Alternativas.
- Versión.
- Compatibilidad.
- Mantenimiento.
- Seguridad.
- Licencia.
- Peso.
- Impacto en bundle.
- Alternativa de salida.
- Decisión.

## 5. Animaciones

Por defecto:

- CSS y Tailwind para microinteracciones simples.
- API nativa o capacidades de Next/React cuando sean suficientes.
- Una librería de movimiento solo para secuencias complejas, layout animations o gestos justificados.
- Nunca instalar dos librerías de animación.

---

# 03 — Migración desde React, Vite, CRA u otro frontend hacia Next.js

## 1. Regla principal

Migrar sin alterar visuales, comportamiento o contratos salvo solicitud explícita.

No reconstruir desde cero cuando el frontend existente puede migrarse de forma incremental.

## 2. Inventario obligatorio

Antes de migrar, crear:

```txt
docs/migration/frontend-inventory.md
```

Debe incluir:

- Rutas.
- Layouts.
- Providers.
- Componentes.
- Hooks.
- Servicios.
- Variables de entorno.
- Assets.
- Formularios.
- Tablas.
- Autenticación.
- Permisos.
- Redirecciones.
- Estado global.
- Fetching.
- Tests.
- Dependencias.
- Deuda técnica.
- Riesgos de hidratación.

## 3. Mapeo de rutas

Documentar:

```txt
Ruta anterior
→ ruta Next.js
→ route group
→ layout
→ protección
→ loading
→ error
→ metadata
```

## 4. Conversión a App Router

Usar:

```txt
src/
  app/
    layout.tsx
    page.tsx
    loading.tsx
    error.tsx
    not-found.tsx
```

Agregar route groups cuando ayuden a separar:

```txt
(auth)
(public)
(portal)
(admin)
(operations)
```

No usar route groups como decoración.

## 5. React Router

Al migrar:

- `Link` → `next/link`.
- Navegación programática → `useRouter` cuando sea necesario.
- Parámetros → `params` o hooks de App Router.
- Query string → `searchParams` o `useSearchParams`.
- Layouts anidados → `layout.tsx`.
- Guards → protección de ruta compatible con estrategia de sesión.
- Fallbacks → `loading.tsx`, `error.tsx`, `not-found.tsx`.

## 6. Variables de entorno

- `VITE_*` no se copia automáticamente a `NEXT_PUBLIC_*`.
- Solo datos realmente públicos pueden usar `NEXT_PUBLIC_*`.
- Secretos permanecen server-side.
- Validar env con Zod.
- Fallar temprano ante configuración inválida.

## 7. Assets

- Migrar assets sin romper URLs.
- Usar `next/image` cuando aporte optimización.
- Definir dimensiones para evitar CLS.
- Usar `next/font` cuando corresponda.
- No descargar fuentes de forma insegura en runtime.
- Preservar iconografía aprobada.

## 8. Providers

Crear un provider cliente mínimo:

```txt
src/app/providers.tsx
```

No convertir el root layout completo en Client Component.

## 9. Estado

Antes de migrar un store:

- Identificar si es estado de servidor, URL, formulario, UI local o sesión.
- No copiar todo a Zustand/Redux.
- Estado de servidor → TanStack Query o Server Components.
- Filtros compartibles → URL.
- Formulario → React Hook Form.
- UI local → `useState` o reducer.
- Store global solo para estado realmente global.

## 10. Hidratación

Evitar:

- Leer `window` durante SSR.
- Fechas o valores aleatorios distintos entre servidor y cliente.
- Condiciones de render basadas en storage antes de hidratar.
- HTML inválido.
- Providers duplicados.
- Locale diferente entre servidor y cliente.

No ocultar hydration warnings. Corregir la causa.

## 11. Gate de migración

- Paridad visual.
- Paridad funcional.
- Rutas.
- Auth.
- Permisos.
- Formularios.
- Tablas.
- Responsive.
- Tests.
- Build.
- Lighthouse.
- Sin hydration errors.

---

# 04 — Arquitectura de carpetas

## 1. Estructura generalista recomendada

```txt
src/
  app/
    (public)/
    (auth)/
    (portal)/
    (admin)/
    api/
    layout.tsx
    providers.tsx
    error.tsx
    global-error.tsx
    not-found.tsx

  features/
    <feature>/
      components/
      hooks/
      services/
      schemas/
      mappers/
      types/
      tests/
      README.md

  shared/
    api/
    auth/
    components/
      ui/
      layout/
      feedback/
      data-display/
    config/
    hooks/
    i18n/
    lib/
    observability/
    security/
    styles/
    types/

  generated/
```

## 2. Responsabilidades

### `app/`

- Rutas.
- Layouts.
- Composición.
- Metadata.
- Loading/error boundaries.
- Server Components de página.
- Route Handlers cuando estén justificados.

No contener reglas complejas.

### `features/`

- Componentes específicos.
- Hooks específicos.
- Servicios específicos.
- Schemas.
- Mappers.
- Tipos.
- Casos de uso de interfaz.

### `shared/`

Solo capacidades transversales estables.

No mover reglas de negocio a `shared`.

### `generated/`

- Tipos OpenAPI.
- Archivos derivados.
- No editar manualmente.

## 3. Prohibiciones

- No carpeta global `utils` sin clasificación.
- No `components/` con cientos de archivos sin feature.
- No un hook universal de API.
- No un formulario universal que intente representar cualquier entidad.
- No componente Dios.
- No duplicar API clients.
- No `fetch` desde componentes.

---

# 05 — Server Components, Client Components y composición

## 1. Server Components por defecto

Usar Server Components para:

- Layout estático.
- Metadata.
- Datos no interactivos.
- Lecturas seguras server-side.
- Reducir JavaScript.
- Componer vistas.

## 2. Client Components solo cuando sean necesarios

Usar `"use client"` para:

- Eventos.
- Estado local interactivo.
- Hooks del navegador.
- TanStack Query.
- Formularios interactivos.
- Animaciones que requieran runtime cliente.
- Componentes Radix que lo necesiten.

## 3. Límites pequeños

No marcar una página completa como cliente si solo un botón necesita interacción.

Extraer una isla cliente.

## 4. Datos serializables

Los props Server → Client deben ser serializables.

No pasar:

- Instancias.
- Funciones no soportadas.
- Objetos ORM.
- Errores crudos.
- Tokens.
- Secretos.

## 5. Caching

Elegir explícitamente:

- Datos públicos cacheables.
- Datos privados por usuario.
- Datos operativos no cacheables.
- Revalidación por tiempo.
- Revalidación por tag.
- Invalidación después de mutación.

No aplicar cache a datos privados sin entender el alcance.

## 6. `force-dynamic`

No usar globalmente por comodidad.

Toda ruta con `force-dynamic` debe justificar:

- Sesión.
- Datos por request.
- Requisitos de privacidad.
- Incompatibilidad con cache.

---

# 06 — Capa de red y contratos de API

## 1. Único punto de red

Debe existir una única capa autorizada.

Estructura sugerida:

```txt
src/shared/api/
  api-client.ts
  request.ts
  response.ts
  errors.ts
  refresh-coordinator.ts
  retry-policy.ts
  query-keys.ts
```

Los services de features llaman esta capa.

## 2. Prohibido

- `fetch` en componentes.
- Axios adicional si ya existe fetch client.
- URLs dispersas.
- Headers construidos en cada feature.
- Manejo de 401 duplicado.
- Parsing repetido.
- Ignorar errores.

## 3. Validación

Toda respuesta externa crítica inicia como `unknown`.

Flujo:

```txt
response
→ parse seguro
→ schema Zod
→ DTO validado
→ mapper
→ ViewModel
```

## 4. OpenAPI

OpenAPI es contrato principal.

Generar:

```txt
src/generated/api-schema.ts
```

CI debe detectar drift.

## 5. Errores

Normalizar:

- Validation.
- Unauthorized.
- Forbidden.
- Not Found.
- Conflict.
- Rate Limit.
- Network.
- Timeout.
- Contract.
- Unexpected.

Incluir `requestId` cuando exista.

## 6. AbortSignal

Propagar cancelación desde:

- TanStack Query.
- Server request.
- Búsqueda.
- Autocomplete.
- Cambio de ruta.

## 7. Timeout

Toda llamada debe tener timeout configurable.

No usar un timeout único ciego para:

- Picker.
- Listado.
- Exportación.
- Job.
- Reporte largo.

Los procesos largos deben convertirse en jobs observables.

---

# 07 — Prevención obligatoria de overfetch y uso de endpoints de picking

## 1. Regla principal

Cuando el backend disponga de endpoints de picking, lookup, options, summaries, projections o equivalentes, el frontend debe utilizarlos.

No consumir una entidad completa para:

- Poblar un select.
- Mostrar nombre + ID.
- Autocomplete.
- Filtro.
- Breadcrumb.
- Badge.
- Selector múltiple.
- Referencia en formulario.

## 2. No inventar nombres

Antes de implementar:

- Revisar OpenAPI.
- Revisar `endpoints.md`.
- Buscar endpoints documentados como picking.
- Confirmar método, filtros, paginación y permisos.
- No inventar `/pick`, `/picker`, `/lookup` o `fields` si el backend no los define.

## 3. Inventario obligatorio de lectura

Crear:

```txt
docs/performance/data-fetching-matrix.md
```

Campos:

| Vista | Necesidad | Endpoint elegido | Campos requeridos | Campos recibidos | Justificación |
|---|---|---|---|---|---|

## 4. Tipos de endpoint

### Picker

Para:

- ID.
- Label.
- Subtitle opcional.
- Estado mínimo.
- Campo de búsqueda.

### List

Para:

- Columnas visibles.
- Paginación.
- Filtros.
- Sort.
- Acciones permitidas.

### Summary

Para:

- Métricas agregadas.
- Tarjetas.
- Contadores.
- Estado ejecutivo.

### Detail

Para:

- Una entidad.
- Campos realmente necesarios.
- Secciones secundarias cargadas bajo demanda.

### Batch lookup

Para resolver varios IDs en una llamada.

No ejecutar N requests por N filas.

## 5. Reglas para selects y autocompletes

- Nunca cargar catálogos completos grandes.
- Búsqueda server-side.
- Debounce.
- AbortSignal.
- Paginación o cursor.
- Límite.
- Estado de carga.
- Sin resultados.
- Error.
- Reintento.
- Cache razonable.
- No almacenar PII en historial.

## 6. Listado y detalle

No hacer:

```txt
GET /entities?include=everything
→ recortar en frontend
```

Hacer:

```txt
endpoint de listado/proyección
→ DTO mínimo
→ detalle bajo demanda
```

## 7. Secciones de detalle

Cargar bajo demanda:

- Historial.
- Auditoría.
- Adjuntos.
- Relaciones.
- Actividad.
- Métricas pesadas.
- Gráficas.

No iniciar todas las requests al montar si la sección está cerrada y no es necesaria.

## 8. N+1 de frontend

Detectar:

```txt
listado
→ por cada fila pedir detalle
```

Soluciones:

- Batch endpoint.
- Proyección de listado.
- Include seguro definido por backend.
- Summary endpoint.

## 9. Filtros y sorting

- Siempre server-side para datasets paginados.
- No cargar 10.000 filas para filtrar en navegador.
- No ordenar solo la página actual.
- Whitelist de sort y filtros definida por backend.

## 10. Query deduplication

- Query keys consistentes.
- Evitar montar la misma query varias veces con parámetros equivalentes.
- Evitar refetch por providers duplicados.
- Compartir cache cuando el contrato sea idéntico.
- No compartir cache entre tenants o identidades.

## 11. Prefetch

Prefetch solo cuando:

- La probabilidad de navegación sea alta.
- El payload sea pequeño.
- No exponga información.
- No sature red móvil.
- No cause requests innecesarias.

## 12. Métricas

Medir por ruta:

- Número de requests.
- Bytes transferidos.
- Campos usados/recibidos.
- Duplicados.
- Requests canceladas.
- Cache hit.
- Tiempo total.
- Hydration payload.
- JavaScript inicial.

## 13. Gate anti-overfetch

Una vista falla el gate si:

- Usa detalle para un picker.
- Descarga campos sensibles no visibles.
- Hace N+1.
- Filtra globalmente en cliente.
- Ordena solo la página.
- Carga secciones cerradas.
- No cancela búsquedas anteriores.
- No documenta por qué no usa el endpoint picking existente.

## 14. Tests

- Verificar endpoint picker correcto.
- Verificar que no se llama endpoint de detalle.
- Verificar una request por búsqueda estable.
- Verificar cancelación.
- Verificar batch.
- Verificar no N+1.
- Verificar payload contract.

---

# 08 — TanStack Query y estado de servidor

## 1. Uso

TanStack Query se usa para estado remoto interactivo en Client Components.

No usarla para reemplazar:

- Estado local.
- URL.
- Formularios.
- Server Components simples.

## 2. Query keys

Factories tipadas por feature.

Incluir:

- Tenant.
- Identidad si afecta resultado.
- Filtros.
- Page.
- Limit.
- Sort.
- Search.

## 3. `enabled`

Toda query protegida debe usar permiso y precondiciones.

Una query no debe ejecutarse si:

- Falta permiso.
- Falta ID.
- Falta tenant.
- Tab está cerrado y la carga es diferida.
- El formulario no alcanzó longitud mínima de búsqueda.

## 4. Retries

- GET de red/transitorio: limitado.
- 400/401/403/404/409/422: no.
- 429: respetar `Retry-After`.
- Mutaciones: no salvo idempotencia confirmada.

## 5. Cache

- No persistir PII.
- Limpiar al logout.
- Limpiar al cambiar identidad.
- Limpiar al cambiar tenant.
- Invalidar de forma específica.
- No invalidar toda la aplicación por una mutación.

## 6. Polling

Solo cuando el caso lo requiera.

- Pausar en background.
- Pausar offline.
- Backoff.
- Configurable.
- No usar intervalos agresivos por defecto.
- Preferir eventos o jobs cuando existan.

## 7. Placeholder data

Usar para paginación fluida sin mostrar datos incorrectos.

Distinguir:

- Loading inicial.
- Fetching en background.
- Cambio de filtro.
- Refetch.
- Datos stale.

---

# 09 — Auth, sesión, rutas protegidas y permisos

## 1. Default deny

Las rutas privadas son privadas por defecto.

## 2. Estrategia browser

Preferir cookie:

- HttpOnly.
- Secure.
- SameSite.
- Refresh rotation.
- Revocación.
- CSRF cuando aplique.

No guardar tokens en localStorage en producción.

## 3. 401 y 403

- 401: sesión ausente, inválida o vencida.
- 403: usuario autenticado sin permiso.
- 403 no debe cerrar sesión.
- Token vencido debe llevar a login después de intentar refresh seguro.
- Preservar `returnTo` saneado.

## 4. Single-flight refresh

Varias respuestas 401 simultáneas deben compartir una sola operación refresh.

- Un refresh.
- Un reintento por request.
- Un redirect.
- Sin loops.
- Cache limpia si falla.

## 5. Capas de autorización

```txt
Route Guard
Permission Boundary
Query Guard
Action Guard
Backend Guard
```

Ocultar un botón no es seguridad.

## 6. Queries

No montar queries antes de comprobar permisos.

## 7. Roles y permisos

- Catálogo central.
- No strings dispersos.
- Matriz ruta-permiso.
- Tests negativos.
- No mezclar áreas con permisos diferentes.

## 8. Cambio de permisos

- Invalidar datos ya no autorizados.
- Actualizar navegación.
- Redirigir si la ruta deja de ser válida.
- Limpiar PII de cache.

## 9. Multi-tenant

- Tenant desde sesión o contexto seguro.
- No confiar en tenant arbitrario del cliente.
- Separar cache.
- Nunca mezclar resultados.

---

# 10 — Server Actions, Route Handlers y BFF

## 1. No usar por moda

Usar Server Actions cuando:

- Simplifiquen una mutación de formulario.
- Mantengan seguridad server-side.
- No dupliquen el backend.
- El contrato esté claro.

## 2. Route Handlers

Usar para:

- BFF.
- Proxy seguro.
- Adaptación controlada.
- Callbacks.
- Descargas protegidas.
- Integración específica de Next.

No crear un segundo backend completo dentro del frontend.

## 3. BFF

Justificar mediante ADR:

- Manejo de cookies.
- Agregación.
- Ocultamiento de secretos.
- Normalización.
- Reducción de round trips.

No usar BFF para esconder un backend mal diseñado sin plan.

## 4. Seguridad

- Validar inputs.
- Autorización.
- CSRF.
- Rate limit.
- Timeout.
- Redacción.
- No exponer secretos.

---

# 11 — Formularios

## 1. Stack

- React Hook Form.
- Zod.
- Componentes accesibles.
- DTOs explícitos.

## 2. Estados

- Idle.
- Dirty.
- Validating.
- Submitting.
- Success.
- Error.
- Conflict.

## 3. Validación

- Cliente para feedback.
- Servidor como autoridad.
- Errores por campo.
- Error global.
- No borrar datos ante error.

## 4. UX

- Labels visibles.
- Placeholder no reemplaza label.
- Instrucciones antes del error.
- Mensajes específicos.
- Foco al primer error.
- Scroll seguro.
- Campos relacionados agrupados.
- Ayuda contextual.

## 5. Doble envío

- Botón pending.
- Idempotency key.
- Guard local.
- Backend deduplica.

## 6. Cambios sin guardar

En formularios largos:

- Detectar cambios.
- Avisar al navegar.
- No bloquear después de guardar.
- No usar prompts molestos para formularios triviales.

## 7. Acciones sensibles

Confirmación para:

- Eliminar.
- Cancelar.
- Aprobar.
- Rechazar.
- Ejecutar procesos.
- Exportar datos sensibles.
- Cambiar permisos.
- Enviar notificación masiva.

---

# 12 — Tablas, filtros, búsqueda y visualización de datos

## 1. Server-side

Para datasets paginados:

- Pagination server-side.
- Sorting server-side.
- Filtering server-side.
- Search server-side.

## 2. URL state

Persistir cuando aporte valor:

- Page.
- Limit.
- Query.
- Sort.
- Filters.
- Tab.

Beneficios:

- Back/forward.
- Refresh.
- Compartir.
- QA reproducible.

## 3. Tabla

Debe incluir:

- Encabezados semánticos.
- Estado vacío.
- Error.
- Loading.
- Total.
- Página.
- Acciones.
- `aria-sort`.
- Foco.
- Responsive.

## 4. Mobile

Elegir por caso:

- Scroll horizontal.
- Columnas prioritarias.
- Cards.
- Drawer de detalle.

No ocultar información crítica sin alternativa.

## 5. Bulk

Cuando backend soporte bulk:

- Selección clara.
- Contador.
- Confirmación.
- Límite.
- Resultado parcial.
- Errores por fila.
- Idempotencia.

## 6. Exportación

- Permiso.
- Confirmación.
- Filtros aplicados.
- Job si es pesada.
- URL temporal.
- Allowlist de dominio.
- Auditoría.
- Feedback.

---

# 13 — Diseño UI/UX profesional y minimalista

## 1. Principios

- Visibilidad del estado.
- Correspondencia con el mundo real.
- Control del usuario.
- Consistencia.
- Prevención de errores.
- Reconocimiento antes que recuerdo.
- Flexibilidad sin complejidad.
- Diseño estético y minimalista.
- Recuperación de errores.
- Ayuda contextual.

## 2. Jerarquía visual

Cada pantalla debe tener:

1. Contexto.
2. Título.
3. Descripción breve.
4. Acción primaria.
5. Filtros o controles.
6. Contenido.
7. Acciones secundarias.
8. Feedback.

No competir con varias acciones primarias.

## 3. Densidad

- Densidad acorde al actor.
- Panel operativo puede ser denso, pero escaneable.
- Landing puede ser más espaciosa.
- No desperdiciar pantalla en dashboards.
- No saturar con tarjetas sin propósito.
- No convertir todo en cards.

## 4. Tipografía

- Escala consistente.
- Tamaño legible.
- Longitud de línea razonable.
- Monoespaciada solo para código, IDs o valores técnicos.
- No usar mayúsculas extensas.
- Contraste adecuado.

## 5. Color

- Tokens semánticos.
- No depender solo de color.
- Estados consistentes.
- Paleta limitada.
- Gradientes solo si no reducen legibilidad.
- Evitar neón o glow excesivo en sistemas profesionales.

## 6. Espaciado

- Sistema de espaciado consistente.
- Alineación.
- Ritmo vertical.
- Separación por grupos.
- No usar márgenes arbitrarios repetidos.

## 7. Iconos

- Iconos reconocibles.
- Etiqueta cuando el significado no sea universal.
- Tooltip para acciones compactas.
- No usar emojis como iconografía principal de producto.
- Tamaños y strokes consistentes.

## 8. Affordance

Un control debe parecer interactivo.

- Hover.
- Focus.
- Active.
- Disabled.
- Loading.

No hacer que texto normal parezca botón ni viceversa.

## 9. Feedback

Toda acción debe comunicar:

- Fue recibida.
- Está procesando.
- Terminó.
- Falló.
- Qué puede hacer el usuario.

## 10. Errores

- Explicar qué ocurrió.
- No culpar al usuario.
- Mostrar cómo resolver.
- Preservar contexto.
- Mostrar `requestId` cuando ayude a soporte.

## 11. Empty states

- Explicar por qué está vacío.
- Diferenciar “sin datos” de “sin resultados”.
- Acción útil cuando corresponda.
- No agregar ilustraciones decorativas pesadas sin valor.

## 12. Responsive

Diseñar desde contenido, no solo desde breakpoints.

---

# 14 — Animaciones, transiciones, navegación, notificaciones y clics

## 1. Objetivo

Las animaciones deben:

- Comunicar continuidad.
- Confirmar interacción.
- Reducir sensación de congelamiento.
- Explicar cambios.
- Mantener jerarquía.

No deben:

- Retrasar.
- Marear.
- Distraer.
- Ocultar latencia.
- Bloquear acciones.
- Producir CLS.
- Convertir la interfaz en algo infantil.

## 2. Regla de minimalismo

Usar animaciones sutiles, rápidas y coherentes.

Preferir:

- Opacity.
- Transform.
- Scale leve.
- Translate corto.

Evitar:

- Rebotes exagerados.
- Rotaciones innecesarias.
- Zoom grande.
- Parallax en paneles operativos.
- Animar altura de listas enormes.
- Sombras pulsantes permanentes.
- Animaciones distintas por pantalla.

## 3. Duraciones base

Rangos orientativos:

| Interacción | Duración |
|---|---:|
| Click/press | 80–140 ms |
| Hover/focus | 120–180 ms |
| Tooltip/popover | 140–220 ms |
| Dialog/drawer | 180–260 ms |
| Toast | 180–260 ms |
| Cambio de sección | 180–300 ms |
| Skeleton shimmer | lento y discreto |

No hardcodear cada duración de forma aislada. Crear tokens.

## 4. Easing

- Entrada: desaceleración suave.
- Salida: aceleración leve.
- Movimiento: curva consistente.
- No usar `linear` para UI salvo progress indeterminado.

## 5. Clicks profesionales

Botones interactivos deben tener:

- Hover claro.
- Focus visible.
- Active con escala mínima u opacidad.
- Pending con spinner o label.
- Disabled real.
- Protección de doble click.
- Área táctil suficiente.
- Sin mover el layout.

Ejemplo conceptual:

```txt
hover: eleva contraste
active: scale 0.98
pending: spinner + texto estable
disabled: menor énfasis, cursor y semántica correctos
```

No aplicar ripple universal si no pertenece al design system.

## 6. Navegación

Toda transición de ruta debe incluir feedback.

Mecanismos:

- `loading.tsx` por segmento.
- Skeleton alineado al contenido.
- Progress bar discreta.
- Pending state de Link cuando esté disponible.
- Prefetch controlado.
- No desmontar layout estable.

## 7. Page transition

- Animar contenido, no toda la aplicación.
- Mantener sidebar y topbar estables.
- Fade/translate corto.
- No esperar la animación para navegar.
- No reanimar toda la tabla en cada polling.
- No animar cientos de filas.

## 8. Layout transitions

- Evitar saltos.
- Reservar espacio.
- Animar expansión de secciones pequeñas.
- No animar datos que cambian frecuentemente si dificulta lectura.

## 9. Loading

- Skeleton para estructura conocida.
- Spinner para acción compacta.
- Progress para tareas con avance.
- Mensaje para procesos largos.
- Nunca dejar pantalla aparentemente congelada.

## 10. Notificaciones

Tipos:

- Success.
- Info.
- Warning.
- Error.
- Progress.

Reglas:

- Entrada y salida animadas.
- No tapar acciones principales.
- Pausar autocierre al hover/focus.
- Errores importantes no desaparecen demasiado rápido.
- Acción “Reintentar” cuando sea segura.
- `aria-live`.
- No duplicar toasts.
- Agrupar eventos repetidos.
- No lanzar success antes de confirmación real.
- No usar toast como único registro de una acción crítica.

## 11. Campana y centro de notificaciones

- Badge animado sutilmente solo al llegar algo nuevo.
- No pulsar permanentemente.
- Marcar leído con transición breve.
- Conservar historial.
- Paginar.
- No disparar polling agresivo.

## 12. Dialogs y drawers

- Entrada/salida.
- Overlay.
- Focus trap.
- Escape.
- Restaurar focus.
- Reduced motion.
- No animar desde direcciones inconsistentes.

## 13. Listas

- Animar inserciones/eliminaciones solo si ayuda.
- No stagger masivo.
- Mantener posición de scroll.
- Evitar reordenamientos bruscos.

## 14. Reduced motion

Obligatorio respetar:

```css
@media (prefers-reduced-motion: reduce)
```

En modo reducido:

- Eliminar desplazamientos.
- Mantener feedback con opacity instantánea o corta.
- Deshabilitar loops.
- No depender de movimiento para comunicar.

## 15. Rendimiento

Animar propiedades compositables.

Evitar:

- `top`.
- `left`.
- `width`.
- `height`.
- Filtros costosos.
- Blur grande continuo.

Medir INP y frames en pantallas complejas.

## 16. Tokens

Crear:

```txt
src/shared/styles/motion-tokens.ts
```

o variables CSS para:

- Duración.
- Easing.
- Distancia.
- Scale.
- Reduced motion.

## 17. Tests de movimiento

- Reduced motion.
- Focus.
- Dialog.
- Toast.
- Route loading.
- No doble click.
- No layout shift.
- No animación infinita innecesaria.

---

# 15 — Design system, shadcn/ui y consistencia

## 1. Primitivas base

Evaluar:

- Button.
- Input.
- Textarea.
- Select.
- Combobox.
- Dialog.
- Alert Dialog.
- Sheet.
- Dropdown.
- Popover.
- Tooltip.
- Tabs.
- Table.
- Badge.
- Alert.
- Skeleton.
- Toast.
- Form.
- Command.

## 2. No duplicar

Una primitive por responsabilidad.

Al migrar:

- Reemplazar.
- Probar.
- Eliminar versión anterior.
- Actualizar docs.

## 3. Tokens

- Color.
- Typography.
- Spacing.
- Radius.
- Border.
- Shadow.
- Motion.
- Z-index.
- Breakpoints.
- States.

## 4. Variantes

No crear decenas de variantes arbitrarias.

Cada variante debe representar una semántica real.

## 5. Storybook

Usar cuando:

- Equipo amplio.
- Muchas primitives.
- Revisión visual.
- Variantes complejas.

Si no se justifica, documentar en Markdown.

---

# 16 — Accesibilidad WCAG 2.2 AA

## 1. Meta

WCAG 2.2 AA como mínimo para flujos principales.

## 2. Semántica

- HTML semántico.
- Un `h1`.
- Headings ordenados.
- Landmarks.
- Buttons para acciones.
- Links para navegación.
- Labels.
- Descriptions.
- Status.

## 3. Teclado

- Todo operable.
- Sin traps.
- Orden lógico.
- Escape.
- Focus visible.
- Skip link.
- Restauración de focus.

## 4. Contraste

- Texto.
- Controles.
- Focus.
- Estados.
- Gráficas.

No depender solo de color.

## 5. Formularios

- Error identificado.
- Sugerencia.
- Relación `aria-describedby`.
- No exigir memoria innecesaria.
- Autenticación accesible.

## 6. Status messages

- Toasts.
- Loading.
- Success.
- Error.
- Actualizaciones de resultados.

Usar `aria-live` apropiado.

## 7. Target size

Controles táctiles suficientemente grandes y separados.

## 8. Motion

Reduced motion obligatorio.

## 9. Reflow

- 320 CSS px.
- Zoom 200%.
- Sin pérdida de funcionalidad.

## 10. Pruebas

- ESLint jsx-a11y.
- Axe.
- Playwright.
- Lighthouse.
- Teclado manual.
- Lector de pantalla.

## 11. Gate

- Cero violaciones críticas/serias de Axe.
- Flujos críticos por teclado.
- Focus no oculto.
- Contraste AA.
- Status anunciados.

---

# 17 — Responsive, móvil y dispositivos

## 1. Mobile-first cuando aplique

No asumir escritorio como único dispositivo salvo requisito explícito documentado.

## 2. Navegación móvil

Si el sidebar se oculta:

- Debe existir drawer.
- Hamburger.
- Focus trap.
- Overlay.
- Escape.
- Cierre al navegar.
- Mismos permisos.
- Scroll lock.

## 3. Breakpoints de prueba

Mínimo:

- 320.
- 375.
- 768.
- 1024.
- 1440.
- 1920.

## 4. Touch

- Área suficiente.
- No depender de hover.
- Gestos con alternativa.
- Evitar controles demasiado juntos.

## 5. Teclado móvil

- `inputMode`.
- `autocomplete`.
- Tipo correcto.
- No bloquear zoom.

---

# 18 — Estados de pantalla y resiliencia visual

Toda vista remota debe manejar:

- Initial loading.
- Background fetching.
- Empty.
- No results.
- Error.
- Forbidden.
- Offline.
- Timeout.
- Success.
- Partial success.
- Stale.
- Maintenance.

## 1. Loading

No mostrar spinner gigante para todo.

Elegir:

- Skeleton.
- Spinner local.
- Progress.
- Optimistic state.

## 2. Error

- Mensaje claro.
- Retry.
- Request ID.
- No stack.
- No payload.

## 3. Partial success

En bulk:

- Total.
- Éxitos.
- Fallos.
- Detalle por fila.
- Reintento seguro.

## 4. Optimistic UI

Solo cuando:

- Reversión clara.
- Bajo riesgo.
- Conflictos manejables.

No usar optimismo en decisiones críticas sin evidencia.

---

# 19 — Internacionalización y localización

## 1. Locale

Inicial:

```txt
es-BO
```

## 2. Formatos

- BOB.
- Fechas.
- Números.
- Porcentajes.
- Duraciones.
- Zona horaria definida.

## 3. Textos

No hardcodear textos repetidos de producto.

## 4. Error codes

Mapear códigos del backend a mensajes.

No depender del texto backend como contrato.

## 5. Preparación

Agregar idioma sin reescribir componentes.

---

# 20 — PII, privacidad y seguridad frontend

## 1. Clasificación

- Public.
- Internal.
- Confidential.
- PII.
- Sensitive PII.
- Secret.

## 2. Minimización

No pedir ni descargar campos innecesarios.

El uso de picking endpoints también es un control de privacidad.

## 3. Masking

Componente central:

```txt
MaskedValue
```

Tipos:

- Email.
- Phone.
- Document.
- Account.
- IP.
- Identifier.

## 4. Reveal

- Permiso.
- Acción.
- Auditoría backend.
- No persistir.
- Ocultar al salir.

## 5. Storage

No almacenar:

- Tokens.
- PII.
- Payloads.
- Contraseñas.
- Secretos.

## 6. XSS

No usar `dangerouslySetInnerHTML` salvo:

- Caso justificado.
- Sanitización robusta.
- Tests.
- CSP.
- ADR.

## 7. Descargas

- Allowlist.
- URL temporal.
- No `window.open` arbitrario.
- Confirmación.
- Auditoría.

## 8. CSP

Definir CSP y probar primero en report-only.

---

# 21 — Notificaciones operativas y tiempo real

## 1. Elegir mecanismo

- Polling.
- SSE.
- WebSocket.
- Push.

Mediante evidencia y contrato.

## 2. Polling

- Intervalo razonable.
- Background pause.
- Offline pause.
- Backoff.
- Dedup.

## 3. WebSocket/SSE

- Reconexión controlada.
- Backoff.
- Auth.
- Tenant.
- Resync.
- Idempotencia de evento.
- No confiar en evento como única fuente.

## 4. UI

- Estado de conexión.
- Recuperación.
- No duplicar mensajes.
- Animación sutil.

---

# 22 — Observabilidad frontend

## 1. Adaptador único

```txt
src/shared/observability/
```

## 2. Capturar

- Unhandled error.
- Error boundary.
- Contract error.
- Refresh failure.
- Web Vitals.
- Export failure.
- Critical action failure.
- Provider failure.
- Hydration error.

## 3. Contexto

- Release.
- Environment.
- Route.
- Request ID.
- Operation.
- Browser.

## 4. Redacción

No:

- Token.
- Cookie.
- Password.
- Body sensible.
- PII innecesaria.

## 5. Correlación

Mostrar y reportar `requestId`.

---

# 23 — Rendimiento, Core Web Vitals y bundle

## 1. Metas base

- LCP ≤ 2.5 s.
- INP ≤ 200 ms.
- CLS ≤ 0.1.
- Cero hydration errors.
- Cero requests duplicadas evitables.

## 2. Medición

- Lighthouse CI.
- Web Vitals.
- Bundle analyzer.
- DevTools.
- Datos de campo cuando existan.

## 3. JavaScript

- Server Components.
- Lazy loading.
- Dynamic import.
- No importar librerías completas.
- No hidratar contenido estático.

## 4. Gráficas

- Lazy.
- Reducir puntos.
- Agregados server-side.
- No bloquear main thread.

## 5. Imágenes y fuentes

- Tamaños.
- Formatos.
- `next/image`.
- `next/font`.
- Evitar CLS.

## 6. Budgets

Definir por aplicación:

- JS inicial.
- CSS.
- Requests.
- JSON por vista.
- LCP.
- INP.
- CLS.

No inventar un presupuesto único para todos los proyectos.

## 7. Gate de overfetch

Incluir en performance CI cuando sea viable.

---

# 24 — Errores y boundaries

Crear:

```txt
src/app/error.tsx
src/app/global-error.tsx
src/app/not-found.tsx
```

Y boundaries por segmentos críticos.

Diferenciar:

- Render error.
- API error.
- Offline.
- Timeout.
- Forbidden.
- Not found.
- Maintenance.

No dejar white screens.

---

# 25 — Pruebas

## 1. Unit

- Schemas.
- Mappers.
- Formatters.
- Permissions.
- Retry.
- Refresh coordinator.
- PII.
- Motion tokens.
- Picking endpoint selection.

## 2. Component

- Forms.
- Tables.
- Dialogs.
- Drawers.
- Toasts.
- Loading.
- Mobile navigation.
- Reduced motion.

## 3. Integration

- API client + MSW.
- Auth.
- Picking.
- Lists.
- Details.
- Cache.
- Errors.

## 4. E2E

- Login.
- Restore.
- Expiry.
- Logout.
- 403.
- Direct route.
- Mobile navigation.
- Search.
- Picking select.
- Server sorting.
- Bulk.
- Notifications.
- Reduced motion.
- Keyboard.

## 5. Contract

- OpenAPI.
- Zod.
- Mock fixtures.
- Drift.

## 6. Visual regression

Aplicar a:

- Layout.
- Login.
- Dashboard.
- Form.
- Table.
- Mobile nav.
- Dialog.
- Error state.

No depender solo de snapshots.

## 7. Coverage

Base:

- Statements 80%.
- Lines 80%.
- Functions 75%.
- Branches 70%.
- Auth/API críticos con meta mayor.

---

# 26 — Calidad, lint y límites automáticos

Quality gates:

- Format.
- ESLint type-aware.
- TypeScript.
- Tests.
- Coverage.
- Build.
- Max lines.
- Source boundaries.
- Circular dependencies.
- Dead code.
- Secret scan.
- Dependency audit.
- OpenAPI drift.
- Accessibility.
- Bundle budget.
- E2E.

Prohibido:

```ts
typescript.ignoreBuildErrors = true
eslint.ignoreDuringBuilds = true
```

El build no debe ocultar errores.

---

# 27 — CI/CD

Orden:

1. Install frozen.
2. Secret scan.
3. Format.
4. Max lines.
5. Boundaries.
6. Type-check.
7. Lint.
8. Unit.
9. Integration.
10. Coverage.
11. Build.
12. E2E.
13. Axe.
14. Lighthouse.
15. OpenAPI drift.
16. Dependency scan.
17. Bundle report.
18. Artifact upload.

Branch protection obligatoria.

---

# 28 — Deploy y ambientes

Ambientes:

- Local.
- Test.
- Preview.
- Staging.
- Production.

Reglas:

- Preview no usa producción.
- Secrets fuera del repo.
- Variables validadas.
- Release trazable.
- Source maps seguros.
- Rollback.
- Smoke posterior.

## Smoke

- Login.
- Ruta privada.
- 403.
- Picker.
- Listado.
- Sorting.
- Mutation segura.
- Notification.
- Logout.

---

# 29 — Documentación obligatoria

```txt
docs/
  architecture/
    frontend-architecture.md
    data-fetching.md
    auth-flow.md
    decisions/
  contracts/
    frontend-backend-contracts.md
  performance/
    data-fetching-matrix.md
    performance-budget.md
  security/
    rbac-matrix.md
    pii-handling.md
    session-security.md
  testing/
    testing-strategy.md
  ui/
    design-system.md
    ui-ux-source-traceability.md
    motion-guidelines.md
    responsive-guidelines.md
  operations/
    deployment.md
    rollback.md
    observability.md
  progress/
    progress-report.md
```

---

# 30 — Implementación por fases

Antes de modificar:

```txt
docs/implementation/implementation-plan.md
```

Cabecera:

```txt
Fase actual: X de N
Fases completadas: X - 1
Fases restantes: N - X
Objetivo:
Entradas verificadas:
Gate de entrada:
Gate de salida:
```

Fases sugeridas:

1. Descubrimiento.
2. UI/UX y trazabilidad.
3. Arquitectura y migración.
4. API y picking.
5. Auth y permisos.
6. Componentes y design system.
7. Flujos y formularios.
8. Tablas y visualización.
9. Animaciones y feedback.
10. Accesibilidad.
11. Performance.
12. Pruebas.
13. CI/CD.
14. Deploy.
15. Auditoría final.

---

# 31 — Progress report

Actualizar después de cada fase:

```txt
docs/progress/progress-report.md
```

Debe incluir:

- Fase.
- Avances.
- Archivos.
- Pruebas.
- Riesgos.
- Decisiones.
- Desviaciones.
- Bloqueos.
- Fases restantes.
- Estado.

---

# 32 — Formato de entrega

Cuando se implemente:

1. Resumen.
2. Fase.
3. Código.
4. Validaciones.
5. Pruebas ejecutadas.
6. Evidencias.
7. Riesgos.
8. Documentación.
9. Notas de producción.
10. ZIP cuando se solicite proyecto completo.

No afirmar éxito de comandos no ejecutados.

---

# 33 — Definición objetiva de calidad 10/10

## Arquitectura

- App Router correcto.
- Server/Client boundaries.
- Sin componentes Dios.
- Sin archivos >300 líneas.
- Una capa de red.
- Features cohesionadas.

## Datos

- Picking endpoints.
- Sin overfetch.
- Sin N+1.
- Server pagination/filter/sort.
- OpenAPI.
- Zod.
- AbortSignal.

## Seguridad

- Cookie segura.
- CSRF.
- CSP.
- RBAC.
- Queries protegidas.
- PII.
- Sin secretos.
- Descargas seguras.

## UX

- Jerarquía.
- Responsive.
- Loading.
- Empty.
- Error.
- Success.
- Feedback.
- Animaciones coherentes.
- Clicks profesionales.
- Notificaciones accesibles.
- Reduced motion.

## Accesibilidad

- WCAG 2.2 AA.
- Keyboard.
- Focus.
- Axe.
- Contrast.
- Reflow.
- Status.

## Rendimiento

- Web Vitals.
- Bundle budget.
- No hydration errors.
- Sin requests duplicadas.
- Payloads medidos.

## Calidad

- Type-check.
- Lint.
- Unit.
- Integration.
- E2E.
- Contract.
- Build.
- CI.
- Branch protection.

## Operación

- Staging.
- Observability.
- Smoke.
- Rollback.
- Release traceable.

Un solo gate crítico fallido impide 10/10.

---

# 34 — Prohibiciones finales

- No inventar endpoints.
- No ignorar picking endpoints.
- No usar detalle para selects.
- No hacer N+1.
- No filtrar datasets completos en cliente.
- No ordenar localmente páginas server-side.
- No llamar `fetch` desde componentes.
- No guardar tokens en localStorage en producción.
- No ejecutar queries antes de permisos.
- No ocultar build errors.
- No hacer desktop-only sin requisito.
- No animar por decoración.
- No ignorar reduced motion.
- No mostrar pantallas congeladas.
- No lanzar success prematuro.
- No duplicar toasts.
- No exponer PII.
- No crear un segundo backend accidental.
- No declarar 10/10 sin evidencia.

---

# 35 — Regla final

El frontend debe ser:

- Correcto.
- Seguro.
- Accesible.
- Minimalista.
- Profesional.
- Fluido.
- Observable.
- Rápido.
- Verificable.
- Compatible con el backend.
- Eficiente en datos.
- Mantenible.

La animación debe mejorar comprensión.  
El picking debe reducir payload.  
La arquitectura debe reducir deuda.  
La prueba debe convertir afirmaciones en evidencia.
