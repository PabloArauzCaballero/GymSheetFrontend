# Arquitectura y contratos — Fase 04

> Verificado por inspección real del código, no asumido. La arquitectura actual ya satisface el
> criterio del `PROMPT_MAESTRO.md` ("composición de átomos/moléculas/organismos/páginas... combinada
> con módulos por funcionalidad... SOLID mediante contratos y composición, no clases obligatorias").

## Límites de módulo verificados

- **`packages/*` → `apps/*`: cero importaciones cruzadas.** `grep` sobre los diez paquetes
  (`types, schemas, api-client, domain, auth, hooks, notifications, design-tokens, observability,
  tsconfig`) no encontró ningún import desde `@gymsheet/web` ni desde rutas de `apps/`. La regla
  del `CLAUDE.md` raíz ("packages no importan desde apps") se cumple en la práctica, no solo en
  el documento.
- **BFF como frontera dura, no solo convención.** `backend-route-policy.ts` (ver H01 en
  HALLAZGOS.md) es un allowlist explícito por defecto-deniega — el navegador nunca habla
  directo con el backend salvo por esa lista. La corrección de H01 demuestra que el contrato es
  real: agregar una ruta requirió tocar el archivo, no hubo forma de "colarla".
- **Presupuesto de tamaño de archivo auto-impuesto y respetado.** `source-check` exige ≤300
  líneas por archivo. El archivo más grande de `apps/web/src` hoy son 295 líneas
  (`person-enrollment.tsx`); siete archivos están entre 270-295 (lista completa en el log de esta
  sesión). Es una señal de disciplina real, no aspiracional — y explica por qué el código ya está
  particionado en componentes pequeños en vez de "God components".
- **Separación por capas dentro de cada feature**, consistente en los módulos inspeccionados
  (`admin`, `moderation`, `tutorials`): `components/` (presentación), `services/` (acceso a
  datos vía el BFF), y para `tutorials` además `engine/` (coordinación de casos de uso) y
  `storage/` (persistencia — el propio H02 de hoy se corrigió sin tocar `engine/` ni
  `components/`, prueba de que la separación reduce acoplamiento real, no solo nominal).

## Contratos que ya facilitan cambio seguro

- **Sesión y permisos como un solo punto de verdad**: `session.ts` resuelve
  `SessionPrincipal.permissions` una vez; `nav-config.ts` es "fuente única del grid de `/admin`"
  (comentario propio del código) — evita que la navegación y el grid de módulos diverjan, un
  problema que memoria de proyecto registra como ya resuelto (antes eran dos inventarios).
- **`canSee(item, role, permissions)`** en `nav-config.ts` es el único punto que decide
  visibilidad de un ítem de navegación — mismo patrón de "rol primero, permiso después" que
  `RolesGuard`→`PermissionGuard` en el backend, documentado explícitamente como intencional.
- **Gateway con degradación explícita** (`tutorial-progress-gateway.ts`): separa "qué hace la UI"
  de "qué pasa si el backend no responde" mediante un tipo de resultado (`{ source: 'remote' |
  'local' }`) en vez de excepciones silenciosas — el llamador puede decidir si le importa la
  fuente. Patrón reutilizable para otras features que dependan de un backend parcialmente
  implementado.

## Lo que no se propone cambiar

No se propone introducir una capa de dominio/casos de uso adicional donde ya existe una
separación funcional suficiente (`services/` ya aísla el acceso a datos de la presentación en
todos los módulos inspeccionados). El `PROMPT_MAESTRO.md` es explícito: "Mantén interfaces
pequeñas y explícitas; evita... abstracciones sin consumidores." Añadir una capa de "casos de
uso" formal sin un consumidor real que lo necesite sería exactamente esa abstracción sin
consumidores.

## Pendiente (no ejecutado en esta pasada)

- No se auditaron los 19 módulos de `features/*` uno por uno en busca de acoplamiento oculto
  (imports directos entre features en vez de vía `shared/`) — solo se verificó el límite
  paquetes↔apps y se inspeccionaron los tres módulos tocados hoy (`admin`, `moderation`,
  `tutorials`).
- No se midió cobertura de tests por módulo — la evidencia de esta fase es cualitativa
  (separación de capas observada), no cuantitativa.
