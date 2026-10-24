# H3 — Marketplace estilo Facebook Marketplace / Amazon

**Resultado observable:** una persona abre Marketplace y ve un buscador con sugerencias y
búsquedas recientes, categorías reales con conteo, una parrilla de ofertas con precio bien
formateado, insignias honestas y vendedor verificado; filtra y ordena desde una hoja; abre la
**ficha de un producto** (ruta propia, con galería, vendedor y CTA fijo) y el **perfil de un
vendedor** (ruta propia, con galería, horarios, contacto, mapa, planes y reseñas ordenables);
guarda favoritos y ve «Recién vistos»; compra con QR copiando de verdad los datos, y sigue el
estado de su pedido en «Mis compras».

**Referencia:** Facebook Marketplace (buscador con recientes, chips de categoría, parrilla 2
columnas precio-primero, ficha con galería + vendedor + «Enviar mensaje», guardados, «Hoy en tu
zona» solo cuando hay ubicación) y Amazon (ordenar/filtrar en hoja, ficha con galería, viñetas de
beneficios, «Más de este vendedor», preguntas y respuestas, reseñas con histograma y filtro por
estrellas, «Tus pedidos»). **Lo que no se copia:** azul FB, naranja Amazon, «Prime», carrito.

**Kill-test:** escribir «proteína» y que la parrilla cambie por una coincidencia de subcadena en la
descripción (hack actual) en lugar de por categoría/servidor; o tocar «Copiar» en el pago y que el
portapapeles siga vacío.

## Estado real (auditado 2026-10-24, detalle en `../evidencia/auditoria-marketplace.md`)

| Hecho | Dónde |
|---|---|
| Una ruta de **2763 líneas**: 22 `useState`, 8 queries, 5 mutaciones, 4 `Modal` (dos anidados), 1350 líneas de `StyleSheet`; no existe `src/features/marketplace` | `app/(app)/directorio.tsx` |
| Vendedores `DirectoryEntitySummary` (`GYM/COACH/CENTER/STORE/SERVICE_PROVIDER`, rating, verificado, ciudad, `pricingTier`); detalle con `gallery`, `address`, lat/lng, `contactInfo`, `businessHours`, `ratingBreakdown`, `secondaryCategories` — **el móvil no pinta ninguno de los de detalle** | `packages/schemas/src/definitions/directory.ts:47-95` |
| Ofertas `EntityPlan` (`MEMBERSHIP_PLAN/PASS/SERVICE/PRODUCT`, `currentPrice` string, `currency`, `benefits`, `durationDays`, `mediaUrls`, `metadata`) | `directory-payments.ts:26-44` |
| **No existe en la API:** rating por producto, stock/variantes, envío, precio anterior/descuento, marca/categoría/tags por producto, distancia/geo, favoritos, recién vistos, sugerencias, orden por precio, carrito, pasarela online | — |
| Buscador sin debounce (cada tecla pega al servidor); ofertas filtradas en cliente por **subcadenas** (`protein`, `creatina`, `polera`…); categorías hardcodeadas aunque existe `GET /public/directory/categories` | `directorio.tsx:37-44, 90, 124-152` |
| Chips de categoría y segmento activos **en volt** (contradice `FilterChip`) | `directorio.tsx:1463-1467` |
| Tarjeta de oferta: imagen con **URL de Unsplash** de respaldo, check de verificado para todos, ciudad `'Bolivia'` por defecto, botón «Comprar QR» anidado dentro del Pressable de la tarjeta, 20 usos de `fontSizes.micro` (10 pt prohibido), 17 `fontWeight` literales, ~114 números sueltos, 58 usos de volt | `directorio.tsx:588-666`, `1410-2763` |
| Vendedores: rating `'5.0'` inventado cuando no hay reseñas (web dice «Nuevo») | `directorio.tsx:552,735` |
| Detalle de vendedor es un `Modal` pageSheet (sin ruta, sin deep link); el pago abre un **segundo Modal** encima (iOS puede tragárselo) | `directorio.tsx:765-1097, 229-238` |
| Pago: los dos botones «Copiar» solo vibran y muestran toast (**no copian**, `expo-clipboard` instalado); si falla la subida del comprobante **envía el `file://` local** | `directorio.tsx:1181-1190, 1241-1248, 339-342` |
| Sin «Mis compras» aunque existen `GET /directory/payments/orders/my-orders` y `/:id` | `services.ts:1155-1158` |
| Carga: un `ActivityIndicator` a pantalla completa; detalle/planes/reseñas sin estado de error; sin pull-to-refresh; 1 `accessibilityLabel` en todo el archivo | `directorio.tsx:474-477, 784, 831, 953` |
| Entradas con tres nombres: «Directorio y reseñas» (Inicio), «Directorio GymSheet» (menú Comunidad), «Marketplace» (título) | `home.tsx:127-145`, `community-overflow-sheet.tsx:252-262` |
| Deriva de contrato web/móvil: crear pedido (`{order,paymentConfig}` vs `PaymentOrder`), mis pedidos (`{items,total}` vs array); el allowlist del BFF web no incluye planes/payment-config/payments | `services.ts:1130-1158`, `apps/web/.../directory-client.ts:139-170`, `backend-route-policy.ts:178-187` |
| Tres flujos de compra paralelos: pedido de marketplace (QR + comprobante), renovación del gimnasio propio (`membership.tsx`, WhatsApp) y «ya pagué» (`membership-gate.tsx`) | — |
| Tests: 1 archivo web (2 casos); **móvil: ninguno** | `marketplace-plans-section.test.tsx` |

## Decisiones de diseño (D-K*)

- **D-K1 — Nombre único: «Marketplace».** Inicio, menú de Comunidad, título y tour usan la misma
  palabra. (Ambigüedad A-K1: si el cliente prefiere «Directorio», se cambia en un solo sitio:
  `packages/design-tokens/src/tenants.ts` o constante de copy.)
- **D-K2 — Módulo de features.** `src/features/marketplace/` con pantallas `marketplace-screen`,
  `product-screen`, `seller-screen`, `orders-screen`; componentes `product-card`, `seller-card`,
  `price`, `filter-sheet`, `search-header`, `review-list`, `payment-sheet`; hooks
  `use-marketplace-search`, `use-saved`, `use-recently-viewed`, `use-orders`. Rutas expo-router:
  `app/(app)/marketplace/index.tsx`, `producto/[id].tsx`, `vendedor/[slug].tsx`, `compras.tsx`,
  `compras/[id].tsx`; `app/(app)/directorio.tsx` queda como `Redirect` a `/marketplace`.
- **D-K3 — Sin datos inventados.** Fuera `'5.0'`, `'Bolivia'`, `'La Paz'`, `'Banco Registrado'`,
  Unsplash. Sin rating → «Nuevo»; sin ciudad → nada; sin imagen → `MediaImage` con marcador propio
  (icono por tipo sobre `surfaceHigh`); sin banco → el campo no se pinta y el CTA dice «Este vendedor
  aún no cargó datos de pago» (estado honesto).
- **D-K4 — Filtro en servidor donde existe, en cliente donde no, y declarado.** Vendedores:
  `type`, `category_path`, `search`, `rating_min`, `verified_only`, `city` van al servidor. Ofertas:
  `type` al servidor; precio y orden en cliente sobre las ≤ 50 cargadas **con aviso en la hoja**
  («Ordenando lo cargado»). Backend (H3.S1) añade lo mínimo para que deje de ser así: `search`,
  `sort` (`recientes|precio_asc|precio_desc|destacados`), `price_min/max` y cursor en
  `/public/directory/plans`, y cursor en `/entities`.
- **D-K5 — Categorías reales.** Chips desde `GET /public/directory/categories` (`entityCount`),
  `FilterChip` (seleccionado invertido, nunca volt), «Todo» primero; las ofertas se filtran por la
  categoría **del vendedor** (único vínculo existente) hasta que haya taxonomía de producto
  (backend, OUT en esta entrega salvo H3.S1.M4).
- **D-K6 — Ubicación.** No hay geo en la API. Se usa `city` (chip «Tu ciudad» prellenado con la del
  gimnasio del usuario) e `isOnlineOnly` («Online / envíos»). Distancia **solo** en la ficha del
  vendedor (lat/lng de detalle + `expo-location` con permiso) y botón «Cómo llegar». El subtítulo
  «de tu zona» se quita hasta que sea verdad.
- **D-K7 — Favoritos y recién vistos: locales.** `AsyncStorage` con `userId` como prefijo (no es
  dato sensible), máximo 50 cada uno, con aviso «Guardado en este teléfono». Sincronizar entre
  dispositivos es backend (OUT, anotado).
- **D-K8 — Precio.** `components/price.tsx`: `Intl.NumberFormat(locale, {style:'currency',
  currency})` sobre `currentPrice` (string → `Number` solo para mostrar; nunca se calcula nada en el
  cliente). Duración junto al precio para pases/membresías («Bs 250 · 30 días»).
- **D-K9 — Compra.** Un solo `PaymentSheet` (`BottomSheet`) por encima de la ficha de producto
  (sin modales anidados): resumen, glosa con **Copiar real** (`expo-clipboard`), datos bancarios con
  Copiar por campo, QR en placa blanca, comprobante **obligatorio y subido** (si falla la subida no
  se envía; se muestra el error y se conserva lo cargado), referencia, notas; éxito con número de
  pedido y enlace a «Mis compras». Los tres flujos de compra **no se unifican** en esta entrega
  (decisión de negocio A-K2: ¿una `MEMBERSHIP_PLAN` del propio gimnasio debe ir por la renovación?).
- **D-K10 — Ficha de producto.** Galería `mediaUrls` con carrusel y barras segmentadas (reutiliza
  el patrón de `directory-card.tsx:204-262`), precio grande, tipo y duración, viñetas de beneficios,
  tarjeta del vendedor (logo, verificado real, rating o «Nuevo», ciudad, «Ver tienda»), «Preguntas»
  (comentarios `DIRECTORY_PRODUCT`), «Más de este vendedor» (`listPlans`), CTA fijo «Comprar con QR»
  (`StickyFooter`). Guardar (corazón) en la cabecera.
- **D-K11 — Perfil de vendedor.** Portada + logo, nombre, verificado, rating + N reseñas, ciudad,
  categorías; pestañas en una tarjeta (regla de fichas): **Planes y productos** · **Sobre**
  (descripción, galería, horarios con «Abierto ahora», contacto WhatsApp/llamar/IG/web, dirección +
  mapa + «Cómo llegar») · **Reseñas** (histograma tocable como filtro, orden `helpful/recent/
  highest/lowest`, votar útil, respuesta oficial, **editar/borrar la propia**).
- **D-K12 — Mis compras.** Lista de pedidos con estado (`PENDING_PAYMENT` → «Falta el comprobante»
  con CTA; `PENDING_VERIFICATION` → «El vendedor está verificando»; `CONFIRMED`; `REJECTED` con
  `rejectionReason`; `CANCELLED`), detalle con snapshot del plan y datos de pago; entrada desde
  Perfil y desde el éxito de compra. Reanudar un pedido abandonado.
- **D-K13 — Marketing (skills).** `paywalls`/`pricing` para la jerarquía de la tarjeta de plan (precio
  ancla + beneficio principal + CTA único); `cro` para la ficha (CTA sobre el pliegue, prueba social
  real: rating/«Nuevo», sin urgencia inventada); `copywriting`/`copy-editing` para microcopy de tú,
  verbo primero, sin «¡!» en cadena; `onboarding` para el vacío de «Guardados» y de «Mis compras».
  Ninguna táctica de escasez, contador o «solo quedan 3» sin dato real detrás (regla 00 §2).

## Orden de dependencias

```
H3.S1 backend mínimo (cursor, search/sort/precio en plans, GET plan por id ya existe)
  └─► H3.S2 contrato + servicios + hooks (+ corrección de deriva web/móvil)
        └─► H3.S3 cimientos de UI (price, product-card, seller-card, search-header, filter-sheet)
              ├─► H3.S4 pantalla Marketplace
              ├─► H3.S5 ficha de producto + compra
              ├─► H3.S6 perfil de vendedor + reseñas
              └─► H3.S7 guardados, recién vistos, Mis compras
                    └─► H3.S8 tests, a11y, evidencia
```

---

**CA del hito:** el resultado observable, con cuenta real y vendedor con ≥ 1 plan con datos de pago.
**DoD del hito:** backend verde; móvil `type-check` + `lint` (`check-theme` ya está en 0 y debe seguir en 0; lo que hoy incumple `directorio.tsx` y `check-theme` no ve son ~20 usos de `fontSizes.micro`, 17 `fontWeight` literales y ~114 números sueltos); vitest de marketplace verde; Maestro `18-marketplace.yaml`;
capturas 375/430 de Marketplace (carga, vacío, error, datos, buscador con recientes, hoja de
filtros), ficha de producto, pago (copiar, comprobante, éxito), vendedor (3 pestañas), Mis compras;
mutación `UI → POST order → POST receipt → GET my-orders → recarga → UI` en `evidencia/h3-compra.md`;
doble revisión.
**Estado:** TODO

### H3.S1 — Backend mínimo (`GymSheetBackend/src/modules/directory`)

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H3.S1.M1 | `GET /public/directory/plans` admite `search` (normalizado, nombre + descripción), `sort` (`recientes|precio_asc|precio_desc|destacados`=`displayOrder`), `price_min/max`, `entity_type`, `cursor`+`limit` → `{items,nextCursor}`; **sin parámetros nuevos responde como hoy** (array) para no romper web | `sort=precio_asc` ordena por `currentPrice::numeric` | e2e 4 casos verde | TODO |
| H3.S1.M2 | `GET /public/directory/entities` honra el `cursor` ya declarado y devuelve `nextCursor` cuando se pide `cursor` o `paged=1` | 50+ entidades paginan sin huecos | e2e verde | TODO |
| H3.S1.M3 | Confirmar y documentar el contrato real de `POST /directory/payments/orders` y `GET my-orders` (uno de los dos clientes está mal) | respuesta documentada en `docs/api-contracts.md` | revisión + test de contrato | TODO |
| H3.S1.M4 | (Opcional, si cabe) `category_path` en `/plans` filtrando por categoría del vendedor en servidor | chip «Suplementos» filtra en servidor | e2e verde | TODO |
| H3.S1.M5 | Rate limit en `/plans?search` y `/entities?search` | 429 tras el límite | e2e verde | TODO |

### H3.S2 — Contrato, servicios y hooks

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H3.S2.M1 | `directory-payments.ts`: `entityPlanPageSchema`; `directory.ts`: `directoryEntityPageSchema`; el cliente tolera array o página | parse de ambas formas | test `packages/schemas` verde | TODO |
| H3.S2.M2 | `services.ts` `directoryService`: `searchPlans(params)`, `entities(params)` con cursor, `getPlan(id)` (ya existe, se usa), `myOrders`, `getOrder` alineados a H3.S1.M3; mismo arreglo en `apps/web/.../directory-client.ts` | ambos clientes parsean la misma respuesta | tests de servicio verde | TODO |
| H3.S2.M3 | Web: allowlist del BFF (`backend-route-policy.ts`) + `backend-route-policy.test.ts` para `/public/directory/entities/:id/plans`, `/payment-config`, `/public/directory/plans`, `/directory/payments/*` | tests del allowlist verdes | `yarn workspace @gymsheet/web test` | TODO |
| H3.S2.M4 | Hooks: `use-marketplace-search` (`useDebouncedValue` 350 ms, `useInfiniteQuery`, `staleTime` 60 s), `use-categories`, `use-seller(slug)`, `use-plan(id)`, `use-reviews(sort, rating)` con cursor, `use-orders` | cambiar filtro resetea cursor | tests verdes | TODO |
| H3.S2.M5 | `use-saved` y `use-recently-viewed` (`AsyncStorage`, prefijo `userId`, máx. 50, LRU) | guardar/quitar persiste tras reinicio | test con storage falso verde | TODO |
| H3.S2.M6 | `use-recent-searches` (máx. 10, local) y `use-suggestions` (categorías + nombres cargados, en memoria) | sugerencias en < 50 ms | test verde | TODO |

### H3.S3 — Cimientos de UI (reutilizables)

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H3.S3.M1 | Tokens `marketSizes` en `theme/extras.ts` (imagen de tarjeta 1:1, logo 40, portada 160, galería 4:3) y `priceTypography` (precio `xl` semibold, tabular) | `check-theme` en cero | lint | TODO |
| H3.S3.M2 | Adoptar `Price` de **H1.S2.M5** (`amount currency size duration?`) en tarjeta, ficha y pago | «Bs 250,00 · 30 días» y «US$ 19.99» | test verde | TODO |
| H3.S3.M3 | `features/marketplace/product-card.tsx`: `MediaImage` 1:1 con marcador por tipo, precio primero, título 2 líneas, vendedor + check **solo si** `isVerified`, chip «Tu gym», corazón (44 pt) fuera del área que navega; **sin botón anidado** | 4 variantes capturadas | test verde | TODO |
| H3.S3.M4 | `features/marketplace/seller-card.tsx` (parrilla y compacta): portada, logo, nombre, verificado, rating o «Nuevo», ciudad/Online | 3 variantes | test verde | TODO |
| H3.S3.M5 | `features/marketplace/search-header.tsx`: `SearchField` («Buscar productos, planes y tiendas») + botón filtros con contador + al enfocar, panel de **recientes** y **sugerencias** (`FlatList` sobre la parrilla) | tocar reciente busca | test verde | TODO |
| H3.S3.M6 | `features/marketplace/filter-sheet.tsx` (`BottomSheet`): Ordenar (radio), Tipo de oferta, Tipo de vendedor, Solo verificados, Rating mínimo, Ciudad, Online, Rango de precio (dos `Input` numéricos; sin slider); pie fijo «Ver N resultados» / «Limpiar» | contador refleja filtros | test verde | TODO |
| H3.S3.M7 | `features/marketplace/rating.tsx`: estrellas accesibles (`accessibilityLabel="4,5 de 5"`), histograma tocable | un solo renderizador de estrellas en el módulo | grep + test | TODO |

### H3.S4 — Pantalla Marketplace

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H3.S4.M1 | `marketplace-screen.tsx` con `ListScreen` 2 columnas (3 en `wide`): `ScreenHeader` «Marketplace» (sin «de tu zona»), `search-header`, chips de categoría reales (`FilterChip`, scroll horizontal), segmento «Ofertas / Tiendas y gimnasios» con `Segmented` neutro, bloque «Tu gimnasio» (una sola CTA «Ver tienda»), carril «Recién vistos» si hay, parrilla; `onEndReached`; pull-to-refresh | la parrilla no usa filtros por subcadena (grep `protein` = 0) | test + capturas | TODO |
| H3.S4.M2 | Vacío por contexto («Sin resultados para “x”» + «Quitar filtros»), error con reintento, skeleton de parrilla, offline | capturas | capturas | TODO |
| H3.S4.M3 | `app/(app)/directorio.tsx` → `Redirect` a `/marketplace`; entradas renombradas (Inicio, menú Comunidad, tour) | grep «Directorio» en copy de entradas = 0 | grep + Maestro | TODO |
| H3.S4.M4 | Borrar el archivo monolítico una vez que las 4 pantallas nuevas pasan Maestro; `StyleSheet` muerto fuera | `directorio.tsx` ≤ 10 líneas | wc + lint | TODO |

### H3.S5 — Ficha de producto y compra

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H3.S5.M1 | `app/(app)/marketplace/producto/[id].tsx` + `product-screen.tsx`: galería con barras segmentadas y toque izq/der, precio, tipo/duración, beneficios, `seller-card` compacta, «Preguntas», «Más de este vendedor», `StickyFooter` «Comprar con QR»; corazón en `HeroBar` | deep link `gymsheet://marketplace/producto/<id>` abre la ficha | test + capturas | TODO |
| H3.S5.M2 | Registrar «recién visto» al abrir | aparece en el carril | test verde | TODO |
| H3.S5.M3 | `payment-sheet.tsx`: un `BottomSheet` con los pasos de D-K9; **Copiar real** con `expo-clipboard` + toast «Copiado»; QR en placa; comprobante obligatorio (picker → `uploadAttachment`; fallo = error visible y se conserva); referencia/notas; CTA bloqueado mientras envía | tras «Copiar», `Clipboard.getStringAsync()` devuelve la glosa | test con clipboard falso + prueba manual | TODO |
| H3.S5.M4 | Éxito: «Pedido #N enviado al vendedor» + «Ver en Mis compras»; estado sin datos de pago del vendedor: honesto, sin CTA de pago | 2 capturas | capturas | TODO |
| H3.S5.M5 | Evidencia de mutación: `UI → POST orders → POST receipt → GET my-orders → recarga → UI` | 5 capas coinciden | `evidencia/h3-compra.md` | TODO |

### H3.S6 — Perfil de vendedor y reseñas

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H3.S6.M1 | `app/(app)/marketplace/vendedor/[slug].tsx` + `seller-screen.tsx`: cabecera con portada/logo y datos; **una tarjeta con tres pestañas** (Planes y productos · Sobre · Reseñas) centrada y a lo ancho (regla del cliente 09/09/2026) | deep link abre el perfil | test + capturas | TODO |
| H3.S6.M2 | Pestaña Sobre: descripción, galería (`gallery`), horarios con «Abierto ahora / Cierra a las…» (calculado con la hora del dispositivo, declarado), contacto (WhatsApp, llamar, Instagram, web vía `Linking`), dirección + `MapView` estático + «Cómo llegar» (`maps:`/`geo:`), distancia si hay permiso | sin datos de un campo, el campo no se pinta | capturas 2 vendedores (completo / mínimo) | TODO |
| H3.S6.M3 | Pestaña Reseñas: histograma tocable (filtro `rating`), orden (`helpful/recent/highest/lowest`), paginar con `nextCursor`, votar útil (optimista con rollback), respuesta oficial; **editar/borrar la propia** (`userReview` + PATCH/DELETE) | editar persiste tras recarga | test + evidencia de mutación | TODO |
| H3.S6.M4 | Composer de reseña como `BottomSheet` (no modal anidado), 1 por usuario, validación del título/cuerpo según `reviews.ts` | segunda reseña → el backend responde 409 y la UI lo explica | prueba manual registrada | TODO |

### H3.S7 — Guardados, recién vistos y Mis compras

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H3.S7.M1 | `app/(app)/marketplace/guardados.tsx`: parrilla de `product-card` desde `use-saved`; vacío que orienta («Tocá el corazón de un producto…»); aviso «Guardado en este teléfono» | quitar desde la parrilla actualiza | test verde | TODO |
| H3.S7.M2 | `app/(app)/marketplace/compras.tsx` + `compras/[id].tsx` (`orders-screen`): lista por estado con copy de D-K12, CTA «Subir comprobante» cuando `PENDING_PAYMENT` (reabre `payment-sheet` con el pedido), detalle con snapshot | pedido abandonado se reanuda y pasa a `PENDING_VERIFICATION` | evidencia de mutación | TODO |
| H3.S7.M3 | Entradas: Perfil → «Mis compras» y «Guardados»; cabecera de Marketplace → corazón y bolsa (44 pt) | 4 entradas navegan | Maestro | TODO |

### H3.S8 — Pruebas, accesibilidad, evidencia

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H3.S8.M1 | Vitest (shim `rn-dom`): parrilla, buscador con recientes, hoja de filtros, ficha de producto, pago (copiar, comprobante obligatorio), vendedor (pestañas), reseñas (orden/filtro/editar), Mis compras | 8 archivos | vitest verde | TODO |
| H3.S8.M2 | Maestro `18-marketplace.yaml`: buscar, filtrar, abrir producto, guardar, abrir vendedor, pestaña Reseñas, Mis compras | pasa | salida en `evidencia/` | TODO |
| H3.S8.M3 | Accesibilidad: cada tarjeta un solo elemento accesible con label compuesto («Proteína X, Bs 250, Tienda Y verificada»); estrellas con texto; targets ≥ 44; galería con acciones de accesibilidad | checklist | `evidencia/a11y-marketplace.md` | TODO |
| H3.S8.M4 | `check-theme` en cero en `src/features/marketplace` y en las rutas nuevas; `fontSizes.micro` = 0 usos | grep | lint | TODO |
| H3.S8.M5 | Doble revisión visual por `visual-reviewer` + revisión de copy con `copy-editing` (sin AI-tells, de tú) | ≥ ACEPTABLE CON RESERVAS | `evidencia/doble-revision.md` | TODO |

## Riesgos propios de H3

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Ordenar por precio en cliente sobre 50 items si H3.S1.M1 se retrasa | orden parcial | la hoja lo dice («Ordenando lo cargado») y se registra en No cubierto |
| Tres flujos de compra | confusión del usuario | D-K9 no los mezcla; A-K2 escalada a Pablo con las tres opciones |
| Horario «Abierto ahora» con zona horaria del vendedor desconocida | dato engañoso | se calcula con la hora local del dispositivo y se declara «según tu hora»; si `businessHours` falta, no se muestra |
| `expo-location` en un marketplace | permiso sensible | solo bajo demanda en la ficha del vendedor, nunca al abrir Marketplace; nada se envía al servidor |
| Borrar 2763 líneas | regresión silenciosa | se borra solo después de Maestro verde en las 4 pantallas; redirect mantiene la ruta vieja |
