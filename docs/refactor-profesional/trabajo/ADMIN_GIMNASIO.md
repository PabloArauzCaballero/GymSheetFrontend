# El administrador de gimnasio: qué puede hacer hoy, qué estaba enterrado y qué falta de verdad

> Origen: revisión del usuario probando el portal con `admin.a@qa.test` (2026-09-22). Todo lo de
> abajo está verificado contra el código y contra la aplicación corriendo, no supuesto.

## El problema de fondo, y por qué parecía que faltaban cosas que sí existen

La cuenta de personal veía **la aplicación del socio completa antes que sus propias
herramientas**: Panel, Tu senda, Entrenamientos, Mis planes, Rutinas, Ejercicios, Comunidad,
Descubrir, Interacciones, Mensajes, Membresía, Acceso, Avisos, Mi perfil, Centro de ayuda — quince
destinos — y recién después «Panel del gimnasio», que es donde viven *uso de máquinas* y *flujo de
personas*. Al entrar, además, aterrizaba en el panel del socio, que le abría con «Aún no tienes
membresía» y cuatro indicadores en cero de un entrenamiento que no hace.

Con eso encima, la conclusión razonable de cualquiera que lo pruebe es «esto no tiene analítica de
gimnasio». La tenía; estaba tapada.

**Corregido en esta pasada** (ver commit de navegación por audiencia):
- `ADMIN` y `FRONT_DESK` ahora ven dos grupos: **Gimnasio** (sus módulos, con «Panel del gimnasio»
  primero) y **Tu cuenta** (membresía, acceso, avisos, mensajes, perfil, ayuda).
- `/dashboard` los lleva a `/admin/operacion`, siguiendo el mismo criterio ya escrito en el código
  para `SYSTEM_ADMIN` ("es una pantalla de socio… que su cuenta no tiene").
- `COACH` y `CLIENTE` conservan la navegación de socio intacta: para un entrenador, rutinas y
  ejercicios **son** su trabajo.
- De paso: en `/admin/operacion` se encendían dos entradas a la vez («Panel del gimnasio» y
  «Operaciones»). Ahora se ilumina sólo el destino más específico.

## Lo que YA existe (y ahora se encuentra)

| Necesidad que planteaste | Dónde está | Qué da exactamente |
|---|---|---|
| Registrar sucursales | `/admin/facilities` → Sedes | Alta con código, nombre, zona horaria, descripción; estado ACTIVE/INACTIVE por sede. **Probado: alta real, `POST` 201.** |
| Planes que ofrece el gimnasio | `/admin/membership` → Planes | Precio, beneficios, disponibilidad por sede, imagen QR de cobro. |
| Máquinas pico | `/admin/operacion` → «Uso de máquinas» | Top 20 por series registradas, con sesiones y personas distintas, ventana configurable. Agrupa por ejercicio cuando la máquina no está asignada, para no exigir configuración previa. |
| Entradas al gimnasio + entrenos legítimos | `/admin/operacion` → «Flujo de personas» | Serie diaria que cruza **entradas físicas concedidas** (`access_control.decisions`, outcome GRANTED) contra **entrenos registrados en la app**. El cruce es el dato: cien entradas con quince entrenos significa que no usan la app; entrenos sin entradas apunta a un lector roto. |
| Quién no renovó | `/admin/operacion` → «No han renovado» | Incluye a quien nunca tuvo membresía. |
| Comunidad del gimnasio | `/comunidad` | Ya está acotada al tenant: son los socios de *ese* gimnasio, con buscador y podio. Hoy es una pantalla de socio, no de gestión (ver abajo). |
| Salas, puntos de acceso, mantenimiento, asignación de activos | `/admin/facilities` (pestañas) | Con transiciones de estado explícitas. |
| Equipamiento, alta individual y masiva | `/admin/equipment` | Incluye carga masiva CSV/JSON y alta desde catálogo. |

## Lo que FALTA de verdad (verificado: no existe)

Ordenado por lo que más rinde para quien atiende un gimnasio:

1. **Horarios pico.** `peopleFlow` agrupa **por día**, no por hora. Hay fechas pico; no hay
   «los martes de 19:00 a 21:00 se satura». Es el cambio más barato de todos: la consulta ya
   tiene el timestamp (`decided_at`, `fecha_inicio`), sólo hay que agrupar por hora y devolver una
   segunda serie. **Backend + una tarjeta nueva.**
2. **Salidas.** Hoy sólo se registran entradas concedidas. Sin salida no hay aforo en tiempo real
   ni permanencia media, que es lo que convierte «cuánta gente entró» en «cuánta gente hay ahora».
   Requiere decidir si el lector emite evento de salida o se infiere por tiempo. **Backend +
   hardware/decisión de producto.**
3. **Máquinas o artefactos más pedidos.** Distinto de las más usadas: es demanda insatisfecha
   (lo que la gente pide y el gimnasio no tiene, o tiene de menos). No existe ningún canal para
   capturarlo. **Backend (tabla + endpoint) + UI de socio para pedir + panel para leerlo.**
4. **Encuestas.** No existe nada: cero coincidencias de `encuesta`/`survey`/`poll` en todo el
   backend y el frontend. Es una funcionalidad completa (definición, publicación, respuesta,
   resultados), no un ajuste de UX. **Backend + dos superficies de UI.**
5. **Carga masiva de sucursales.** La carga masiva existe para equipamiento y para rutinas, no
   para sedes. Es el patrón ya resuelto dos veces en este repo, así que es el más mecánico de la
   lista. **Backend (endpoint de lote) + reutilizar el diálogo de import.**
6. **Comunidad como superficie de gestión.** Hoy el admin ve la comunidad con ojos de socio. Para
   gestionar haría falta lo que ya existe en moderación (`/admin/moderacion`) enlazado desde ahí,
   más una vista de actividad del gimnasio. **Mayormente UI; el motor de moderación ya está.**

## Honestidad sobre el alcance

Los puntos 1 a 5 no son refactorización de UX/UI: son funcionalidad nueva de punta a punta
(esquema, endpoints, permisos, UI, pruebas). Este encargo —el kit de
`docs/refactor-profesional/`— autoriza auditar, diseñar y refactorizar lo existente. Construir
encuestas o analítica de demanda por mi cuenta, sin que decidas alcance y prioridad, sería
meterte funcionalidad a medio hacer en un producto que ya tiene un plan propio
(`docs/plan/PLAN-ADMIN-PORTAL-V2.md`, con fases F1-F8 donde varias de estas piezas encajan).

Lo que sí hice aquí y ahora es lo que impedía ver el producto: ordenar la navegación por
audiencia y llevar al personal a su panel. Dime cuál de los seis quieres primero y lo construyo
completo —backend incluido— en vez de dejarlo enunciado.
