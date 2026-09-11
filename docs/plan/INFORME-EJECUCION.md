# Informe de ejecución — Red social Tinder + Stories Instagram + Interacciones

Plan de referencia: `PLAN-SOCIAL-TINDER-INSTAGRAM.md`
Ramas: backend `feat/social-interactions-tinder` · frontend `feat/social-tinder-instagram`
Sin `git push`: es una acción irreversible y requiere permiso explícito.

---

## Entorno de trabajo (verificado, no supuesto)

| Pieza | Estado |
|---|---|
| Docker Desktop | **No disponible.** El proceso `com.docker.backend` arranca pero el daemon nunca acepta conexiones en su socket. Se descartó como camino. |
| PostgreSQL 16.14 | **Vivo** en `localhost:5433`, base `gym_sheet`, con los 15 esquemas del proyecto y las migraciones al día. Es el que usa el backend según su `.env`. |
| Node | El de la máquina es **24.19.0**; ambos repos declaran `engines.node: ">=20 <24"`, así que todo `yarn` falla con `The engine "node" is incompatible`. Se usa el Node 22.23.2 de Homebrew (`/opt/homebrew/opt/node@22/bin`). Se avisó a los siete ejecutores. |
| Xcode 26.6 · iOS 26.5 | Simulador **iPhone 17 Pro arrancado**, con `app.gymsheet.mobile` ya instalada de una sesión anterior y los Pods presentes. |
| Maestro | Instalado, con cuatro flujos existentes en `apps/mobile/.maestro/`. |

---

## Ola 0 — Contratos y superficie compartida (ejecutada por el orquestador)

Esta ola la escribió el orquestador a solas, antes de repartir nada, porque toca ficheros que
después leen todos los ejecutores. Dos agentes escribiendo el mismo contrato es la forma más
rápida de corromperlo.

| Cambio | Fichero | Verificación |
|---|---|---|
| La consulta del directorio devuelve la **galería completa** (hasta 6 fotos, ordenadas por `position`) y la **edad**, en vez de una sola foto | `GymSheetBackend/src/modules/social/social.repository.ts` | El `LEFT JOIN LATERAL` recorta a 6 **dentro** del subselect y agrega después, para no traer filas que luego se tiran |
| `photos` y `age` en la respuesta; `photoUrl` se conserva como `photos[0]` | `.../social.mapper.ts` | Hay consumidores vivos de `photoUrl` en web y móvil: retirarlo habría roto la tira de conexiones y el avatar del chat |
| `shortenName` pasa a exportada | `.../social.mapper.ts` | La necesitaba otra unidad para que el mismo socio no salga con dos nombres distintos en dos pantallas |
| Columna `profileViewsCheckedAt` | `.../profile-social-settings.model.ts` | — |
| Migración `202609110001-social-interactions` | `GymSheetBackend/src/database/migrations/` | **Aplicada de verdad** contra `localhost:5433`. Comprobado con psql: existe la columna `social.profile_settings.profile_views_checked_at` y el índice `ix_discovery_passes_target_recent` |
| Contratos compartidos: `photos`, `age`, likes, descartes, contadores, espectadores de story, espectadores de perfil | `GymSheetFrontend/packages/schemas/src/definitions/{social,stories}.ts` | `yarn workspace @gymsheet/schemas type-check` limpio |
| Servicios de móvil para las rutas nuevas | `GymSheetFrontend/apps/mobile/src/api/services.ts` | Fichero compartido por tres ejecutores de interfaz: lo escribió el orquestador para que ninguno lo tocara |

### Decisión de alcance registrada

La base de datos **no tiene** campo de biografía, ni fecha de nacimiento, ni intereses libres, ni
ubicación del socio. La tarjeta se construye con lo que sí existe: nombre, edad, galería, objetivo,
sucursal, género, nivel de experiencia, rango, puntos, estado social e insignias.

No se inventó un campo de biografía. Añadirlo arrastra columna, endpoint, validación, pantalla de
edición y migración de datos existentes, y eso es un producto distinto del que se pidió. Queda
anotado como pendiente de producto, no como olvido.

---

## Ola 1 — Ejecutores (propiedad exclusiva de ficheros)

| Unidad | Alcance | Ficheros propios | Estado |
|---|---|---|---|
| E1 | Stories sólo de matches, orden Instagram, espectadores de story | `src/modules/stories/**` | Entregada |
| E2 | Lista de quién vio mi perfil, resumen ampliado, marca de revisado | `src/modules/profile-views/**` | Entregada |
| E3 | Likes recibidos y enviados, descartes recibidos y enviados, contadores | `src/modules/social/**` | Entregada |
| E5 | Tarjeta y baraja estilo Tinder | `directory-card.tsx`, `descubrir.tsx`, `profile-detail-sheet.tsx` | Entregada y reparada |
| E6 | Tira y visor de stories estilo Instagram | `stories-bar.tsx`, `story-viewer.tsx` | Entregada y reparada |
| E7 | Pantalla de interacciones y navegación | `interacciones.tsx`, `(tabs)/*`, `perfil/[userId].tsx` | Entregada |
| E8 | Paridad de la web | `apps/web/**` | Entregada |
| E9 | Sembrador de datos sociales de demostración | `apps/mobile/scripts/seed-social-demo.mjs` | Entregada y ejecutada |

---

## Ola 2 — Revisores

Cada revisor arranca **en cuanto su ejecutor termina**, no al final. Recibe los criterios de
aceptación de su requisito y la instrucción de citar `fichero:línea` o salida literal de comando;
un revisor que no puede citar evidencia devuelve `NO VERIFICADO`, nunca `OK`.

| Revisor | Unidad | Veredicto | Defectos encontrados |
|---|---|---|---|
| R-E1 | Stories (backend) | Funcionalmente correcto, **red de seguridad rota** | 4, uno de autorización |
| R-E2 | Vistas de perfil | Los tres criterios verificados contra la base real | 3 reales, 4 informativos |
| R-E3 | Likes y descartes | Correcto salvo **un defecto bloqueante** | 4, uno grave |
| R-E5 | Tarjeta Tinder | Reconocible como Tinder; sin regresiones | 6, ninguno grave |
| R-E6 | Stories (interfaz) | Patrón correcto, **dos defectos graves** | 9 |
| R-E7 | Pantalla de interacciones | Correcta salvo el mismo defecto bloqueante | 2 reales, 1 observación |

### Lo que los revisores encontraron y que ya está corregido

**El defecto bloqueante (R-E3).** La pantalla de interacciones pedía `limit=60` y el backend
valida `max(50)` con Zod. **Las cuatro listas respondían 400**: quién me dio like, a quién se lo di,
quién me descartó y a quién descarté. Es exactamente la funcionalidad que el usuario marcó como
imprescindible, y habría llegado al simulador rota, con el contador cargado encima de cuatro listas
en error. Reproducido por HTTP real antes de tocar nada:

```
GET /me/interactions/likes-received?limit=60 → 400 "Datos de entrada inválidos."
GET /me/interactions/likes-received?limit=50 → 200, 3 filas
```

Corregido alineando el cliente al contrato, no al revés: el número lo manda el backend.

**Dos índices que no sostenían la ordenación (R-E3).** Los índices de conexiones son
`(addressee_id, status)` y `(requester_id, status)`: filtran, pero no llevan la fecha, así que
«los likes pendientes, más recientes primero» leía todas las filas y ordenaba en memoria. Medido
por el revisor con `EXPLAIN (ANALYZE)` sobre 16 000 conexiones: recorrido de 3 000 filas y
`top-N heapsort` para devolver 20. Se añadieron a la migración `(addressee_id, status, created_at DESC)`
y su simétrico, y se reaplicó. Verificado en la base: los cuatro índices existen.

**Una afirmación falsa que justificaba una decisión de diseño (R-E2).** El comentario decía que se
usaba SQL crudo en lugar del ORM porque éste pisaría la visibilidad social de la persona. El revisor
lo ejecutó contra la base y demostró que el ORM **no** la pisa. El SQL crudo se mantiene, porque
acotar por escrito las columnas que una operación puede mover sigue siendo correcto, pero el
comentario y el test que convertían esa falsedad en contrato se reescribieron.

**Una función duplicada tres veces con un comentario obsoleto (R-E2).** El nombre corto de socio
estaba copiado en tres sitios, con un comentario que decía que no se podía importar. Sí se podía.
Ahora se importa. El revisor comprobó antes que las dos implementaciones daban el mismo resultado
en diez casos, incluidos acentos y espacios repetidos.

**Un comentario que describía un comportamiento que el código nunca tuvo.** El nombre corto decía
producir «Ana P.» a partir de «Ana María Pérez Soto»; el código toma el segundo token y produce
«Ana M.». Se corrigió el comentario, no el código: el nombre corto ya está en uso y cambiarlo
movería el nombre de todo el directorio de golpe.

### Lo que los revisores encontraron y está en reparación

| Defecto | Unidad | Por qué importa |
|---|---|---|
| `view` de una story no comprueba el match, y la lista de espectadores lo publica | Stories backend | Quien no es match no ve la story en su feed, pero sí puede marcarla como vista si conoce su identificador, y entonces aparece con nombre y foto ante el autor. Es una incoherencia que nació al hacer el feed sólo de matches |
| Los tests de stories comparan cadenas de SQL, no comportamiento | Stories backend | El revisor construyó una mutación de dos caracteres que **filtra stories de otro gimnasio y caducadas**, y los 29 tests siguen en verde |
| El feed de stories no tiene tope de filas | Stories backend | 1 200 filas de una vez con 300 matches, y el `EXISTS` se evalúa una vez por story del gimnasio |
| El cursor del visor de stories es un índice posicional | Stories interfaz | Un refresco del feed lo reordena y el visor salta a otra persona en silencio, marcando como vista una story que nadie vio |
| El botón de publicar story mide 22 pt | Stories interfaz | La mitad del mínimo del proyecto, y es el único camino para publicar una segunda story |
| El índice de foto se resetea un fotograma tarde | Tarjeta Tinder | Con la base ya sembrada se ve: un parpadeo de la barra equivocada justo al cambiar de carta |
| El botón de información tiene dos manejadores | Tarjeta Tinder | Un `Pressable` dentro de un detector de gestos: quién gana el toque al arrastrar desde esa esquina depende de la plataforma |

---

## Verificación por HTTP real del backend completo

Con las tres unidades de backend entregadas, el orquestador levantó la API y ejercitó los
endpoints nuevos contra el PostgreSQL real.

Detalle que sólo aparece ejecutando: **el proceso que escuchaba en el puerto 3011 era el código
anterior**, de una sesión previa. Servía `404 Cannot GET /api/v1/me/interactions/counts` y
`404` en `/me/profile-views`. Si no se hubiera reiniciado, la app del simulador habría fallado
contra endpoints que sí existen en el código, y el diagnóstico habría apuntado al sitio
equivocado. Se detuvo y se relanzó con el código de esta rama.

Resultado tras el relanzamiento, todo con sesión autenticada de `athlete.mock@gymsheet.local`:

| Endpoint | Respuesta |
|---|---|
| `GET /me/interactions/counts` | `{"likesReceived":0,"likesSent":0,"passesReceived":0,"passesSent":0,"profileViewsNew":0}` |
| `GET /me/interactions/likes-received` | `[]` |
| `GET /me/interactions/passes-received` | `[]` |
| `GET /me/interactions/passes-sent` | `[]` |
| `GET /me/profile-views?limit=5` | `{"viewers":[],"nextCursor":null}` |
| `GET /me/profile-views/summary` | `{"uniqueViewersToday":0,"totalUnique":0,"newSinceLastCheck":0}` |
| `GET /me/stories/feed` | `[]` |
| `GET /me/discovery/deck?limit=3` | fichas con `"photos":[]` y `"age":null` presentes |

Los ceros y los arrays vacíos son correctos: la base tiene usuarios pero todavía ningún dato
social. Lo que esta pasada demuestra es que **las ocho rutas existen, responden 200 y devuelven
exactamente la forma que declaran los contratos compartidos** — incluidos `photos` y `age`, que
son campos nuevos y el punto más probable de ruptura con Zod en el cliente.

---

## Hallazgos transversales

*(Se rellena con lo que los revisores encuentren y con lo que el orquestador detecte al integrar.)*

1. **Discrepancia en `shortenName`.** Su comentario dice que «Ana María Pérez Soto» da «Ana P.»,
   pero el código toma el segundo token y da «Ana M.». El comentario está mal, no el código.
   Pendiente de corregir el comentario.

---

## El límite de sesión, y lo que cambió por él

Tres agentes cayeron a la vez con `rate_limit` de sesión: el reparador de la tarjeta, el
reparador de stories del backend y la ampliación del sembrador. Lo primero que hizo el
orquestador fue comprobar si alguno había dejado el árbol roto — un agente que muere a media
escritura es la forma más rápida de que el repositorio deje de compilar. No fue el caso: los dos
reparadores habían terminado de escribir y murieron **verificando**, así que sus arreglos están
en disco y comprobados por el orquestador uno por uno:

- Índice de foto sin estado retardado, con el identificador de la carta en el mismo estado.
- El `Pressable` duplicado del botón de información retirado, conservando el nombre accesible.
- Guarda de medida inicial antes de evaluar la esquina del toque.
- `view` de una story comprueba la conexión aceptada; la lista de espectadores la filtra también.

La ampliación del sembrador sí quedó a medias: los mocks preexistentes del repo siguen sin foto
ni edad. Está declarado abajo como pendiente.

## Verificación integral

### Backend
```
yarn type-check   → Done, sin errores
yarn lint         → Done, sin errores
yarn test         → Tests: 486 passed, 1 failed, 487 total
```
El único fallo es `exercises-dataset.service.spec.ts`, ajeno y preexistente. **Confirmado por el
orquestador de forma independiente**: guardando en un stash los tres módulos tocados esta noche y
volviendo a ejecutarlo, falla igual. La causa es de configuración de entorno, el conector del
catálogo de ejercicios está deshabilitado.

Los tests pasaron de 469 a 486: diecisiete nuevos, la mayoría de los tests de integración contra
PostgreSQL que el revisor de stories exigió al demostrar que los anteriores no protegían nada.

**Y se comprobó que esos tests no pueden pasar por accidente.** Un test de integración con una
guarda de «si no hay base, sigue adelante» es peor que no tenerlo: pasa en verde precisamente
cuando no está probando nada. El fichero nuevo tiene una guarda de ese tipo, así que se ejecutó
apuntando a un puerto donde no hay PostgreSQL:

```
DB_PORT=5999 yarn test -- --testPathPattern=stories.repository.integration
FAIL src/modules/stories/stories.repository.integration.spec.ts
```

Falla, que es lo correcto. Sólo se salta si alguien pone `SKIP_DB_INTEGRATION_TESTS=1` a
propósito. Con la base viva, los trece casos pasan.

### Móvil
```
yarn workspace @gymsheet/mobile type-check → Done, sin errores
```
`yarn workspace @gymsheet/mobile lint` está **roto de antes**: la configuración raíz ignora
`apps/mobile` entero (`ignores: ['apps/**']`). Verificado que no se tocó en esta rama. El móvil no
tiene lint efectivo, así que el type-check es su única red automática. Queda declarado.

### Web
```
yarn turbo run source-check type-check lint --filter=@gymsheet/web → 3 successful
yarn workspace @gymsheet/web build                                 → Compiled successfully, 44 páginas
yarn workspace @gymsheet/web test                                  → 185 passed (27 ficheros)
```

### Contra la API real, con PostgreSQL vivo
La fuga de autorización de stories, comprobada antes y después del arreglo:

```
NO-match marca como vista una story ajena → 404 "Story no encontrada."
El match marca la misma story             → {"recorded": true}
```

Detalle que sólo aparece ejecutando: la primera pasada de esta prueba **dio verde equivocado**.
El backend estaba sirviendo la compilación anterior, así que el no-match seguía recibiendo
`{"recorded": true}` aunque el arreglo ya estuviera en el código. Hubo que reiniciarlo para medir
lo que el código dice de verdad. Es la segunda vez esta noche que un proceso vivo con código viejo
falsea una verificación.

---

## Simulador de iPhone

Ejecutado en **iPhone 17 Pro con iOS 26.5**, contra el backend NestJS y el PostgreSQL reales, con
la base sembrada. Nueve capturas en `apps/mobile/ios-evidence/`, numeradas de la 30 a la 38.

No hizo falta recompilar el binario nativo: no se añadió ninguna dependencia, así que bastó con
reiniciar Metro con la caché limpia y recargar. Metro empaquetó **1 872 módulos** sin un solo
error de importación, que es la primera prueba de que el grafo entero —incluidos los cinco
ficheros nuevos— es coherente.

| Captura | Qué demuestra |
|---|---|
| `30-comunidad-tira-stories` | La tira de stories con los dos estados del anillo: Mateo con el aro de color (sin ver) y Camila y Valeria con el aro apagado (ya visto), «Tu historia» con el «+», y el indicador de 9 novedades tanto en la cabecera como en la pestaña |
| `31-visor-story` | El visor a pantalla completa con **dos barras segmentadas** (Valeria tiene dos stories), avatar, nombre y «hace 8 h» |
| `32-visor-story-pausado` | El mismo visor con la interfaz oculta al mantener pulsado |
| `33-baraja-tinder` | La tarjeta Tinder: a sangre, **cinco barras de carrusel**, foto real, «Active M. 28» con la edad en peso ligero, metadatos contenidos, botón de ficha y los tres botones de acción escalonados |
| `34-ficha-ampliada` | La hoja de perfil ampliada |
| `35-interacciones-likes` | **Quién me dio like**: «Recibidos 3», rejilla de dos columnas con Ignacio P. 38 y Daniela Z. 34, cada uno con Conectar y Descartar |
| `36-interacciones-visitas` | **Quién vio mi perfil**: seis personas, cada una con marca «Nuevo», tiempo relativo y recuento agregado —4, 4, 8, 4, 4 y 12 visitas—, una fila por persona y no por visita |
| `37-interacciones-nexts` | **Quién me dio next**: «Me descartaron 2» con Rodrigo A. y Lucía M., sin ninguna acción sobre ellos, y la nota de privacidad encima |
| `38-interacciones-descarte-propio` | «Descarté 1» con Andrea S. y el botón «Devolver a la baraja», la única lista de nexts que sí permite actuar |

**Una captura que casi se queda mal etiquetada.** La primera pasada guardó la 38 con el nombre
«descarte-propio» pero la imagen era idéntica a la 37: el toque en «Descarté» no llegó a
aplicarse antes de que terminara el flujo. Una evidencia cuyo nombre no corresponde a lo que
enseña es peor que no tenerla, así que se borró y se volvió a capturar comprobando antes que el
botón «Devolver a la baraja» estuviera en pantalla.

### Dos defectos que sólo aparecieron al ejecutar

**Los rótulos de accesibilidad de las pestañas.** La unidad de interacciones sustituyó el rótulo
que compone iOS —«Inicio, tab, 1 of 5»— por el nombre a secas en las cinco pestañas. Eso rompe
dos cosas a la vez: el flujo `02-pestanas.yaml`, que existía y afirmaba justamente ese texto, y la
orientación de quien navega por voz, que pierde la posición. Se devolvió el rótulo nativo a las
cuatro pestañas que no lo necesitaban y en Comunidad se antepone el aviso sólo cuando hay algo
que contar.

**El enlace profundo pide confirmación.** Abrir `gymsheet://interacciones` desde fuera hace que
iOS pregunte «¿Abrir en GymSheet?». No es un fallo, pero cualquier automatización que llegue por
ahí —una notificación, por ejemplo— tiene que contar con ese diálogo.

---

## Pendiente declarado

1. ~~La ampliación del sembrador quedó a medias.~~ **Cerrado por el orquestador.** Se ejecutó el
   script dos veces más y se encontró un defecto real: era idempotente en todo lo caro —cero
   usuarios nuevos, cero fotos resubidas, matches reutilizados— pero **fallaba al final** por una
   razón que no podía arreglar. Entre una siembra y la siguiente alguien abre la app y ve las
   stories, y una vista no se deshace: no hay endpoint, ni debería haberlo. El script se quedaba
   exigiendo un estado —un anillo de color y otro gris a la vez— que él mismo podía reconstruir y
   no reconstruía.

   Ahora, cuando no queda ninguna sin ver, publica una story más de quien el plan marcó como «no
   la ve el atleta» y vuelve a mirar. Verificado ejecutándolo: `stories en el feed: 6 de 3
   personas, 1 con anillo de color y 2 con anillo gris`, y `0 descargadas, 0 generadas` — no
   resubió nada de lo que ya existía.

   De paso quedó confirmado que **las diez cartas de la baraja tienen ya foto y edad**, incluidos
   los mocks preexistentes del repo: ninguna abre en el estado vacío.
2. **No hay campo de biografía.** Decisión de alcance explicada arriba. Es lo único que separa la
   tarjeta de una de Tinder en contenido, no en forma.
3. **Sin reproductor de vídeo.** Las stories de vídeo se abren en el reproductor del sistema. La
   subida se restringió a imágenes mientras tanto, y el código dice qué hay que hacer para
   levantar la restricción.
4. **El móvil no tiene lint.** Preexistente: la configuración raíz ignora `apps/mobile` entera.
5. ~~El filtro de sucursal de la web.~~ **Cerrado por el orquestador.** Se alimentaba del
   directorio público, que lista sedes de **todas** las marcas, mientras que el directorio de
   socios está acotado al gimnasio propio. Medido contra la API: el endpoint público devuelve
   **9 sedes** y el del gimnasio propio **1**. Es decir, ocho de nueve opciones del selector no
   podían devolver ni un socio, y no decían por qué.

   Ahora usa `/me/facilities/branches`, que es el que ya usaba el móvil. Hizo falta añadir la
   ruta al allowlist del BFF —sin eso el proxy responde 404— y un caso al test que lo cubre, para
   que nadie la convierta en un comodín de prefijo. La suite de la web pasó de 185 a 186 tests.
6. **Defectos de rendimiento anotados y no corregidos**: la lista de visitas de perfil re-agrega
   el historial completo en cada página, y el contador de interacciones no está acotado al mismo
   tope que la lista, así que con más de cincuenta likes pendientes el número y la lista pueden
   discrepar.
7. **Sin `git push`.** Ambas ramas están en local. Empujar es irreversible y necesita tu permiso.
