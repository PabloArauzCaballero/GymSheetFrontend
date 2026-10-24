# Auditoría — marketplace / directorio (2026-10-24, solo lectura)

`D` = `apps/mobile/app/(app)/directorio.tsx` (2763 l.), `S` = `apps/mobile/src/api/services.ts`,
`DP` = `packages/schemas/src/definitions/directory-payments.ts`, `DIR` = `.../directory.ts`.
(`directory-card.tsx` y `catalogue-grid.tsx` no son del marketplace: son la tarjeta de personas y
la cuadrícula de ejercicios; sirven como patrón reutilizable.)

## Qué vende y qué campos hay
- Vendedores `DirectoryEntitySummary` (DIR:47-69): `GYM|COACH|CENTER|STORE|SERVICE_PROVIDER`, `name, headline, logoUrl, coverUrl, primaryCategory, city, country, tenantId?, isOnlineOnly, isVerified, ratingAverage, ratingCount, pricingTier?`. Detalle (DIR:72-95): `description, gallery[], address, latitude, longitude, contactInfo{phone,whatsapp,website,instagram,email}, businessHours, ratingBreakdown, secondaryCategories`.
- Ofertas `EntityPlan` (DP:26-44): `MEMBERSHIP_PLAN|PASS|SERVICE|PRODUCT`, `name, slug, description, benefits[], durationDays, currentPrice (string), currency, status, displayOrder, mediaUrls[], metadata{}, entity?`.
- Categorías `CategoryTreeNode` con `entityCount`. Reseñas (`reviews.ts:35-71`): autor, rating, título, cuerpo, útil, respuesta; lista con score, histograma, `userReview`, `nextCursor`; orden `helpful|recent|highest|lowest` y filtro `rating`. Q&A = comentarios `DIRECTORY_PRODUCT`. Pagos: `EntityPaymentConfig` (banco, QR…), `PaymentOrder` (estados `PENDING_PAYMENT|PENDING_VERIFICATION|CONFIRMED|REJECTED|CANCELLED`, comprobante, `rejectionReason`, `membershipId`). Sin usar: `planPriceHistorySchema`, `createEntityPlanSchema`, `updatePlanPriceSchema`.
- **No existe en la API:** rating/reseñas por producto, stock/variantes/envío, precio anterior/descuento, marca/categoría/tags por producto, distancia/geo, favoritos, recién vistos, sugerencias, orden por precio, carrito, pasarela online, tiempo de respuesta del vendedor.

## Pantalla actual (D)
- 22 `useState`, sin subcomponentes; JSX 46-1408; `StyleSheet` 1410-2763.
- Cabecera «Marketplace — Gimnasios, tiendas y pases de tu zona» (sin ubicación real). Buscador `TextInput` sin debounce (cada tecla → servidor, D:90); ofertas filtradas en cliente. Categorías hardcodeadas (`MARKET_CATEGORIES`) aunque existe `/categories`; chip activo en volt (contradice `FilterChip`). Segmento Ofertas/Tiendas en volt.
- Ofertas: `FlatList` 2 col; cabecera «TU GIMNASIO ACTUAL» con dos CTAs que hacen lo mismo; tarjeta con imagen (Unsplash de respaldo D:594), precio `currency + toFixed(2)`, check para todos, ciudad `'Bolivia'`, botón «Comprar QR» **anidado** en el Pressable.
- Vendedores: 2 col, rating `'5.0'` inventado sin reseñas (D:552,735).
- Detalle: `Modal` pageSheet (sin ruta); planes con «Adquirir con QR»/«Preguntas»; scorecard de reseñas; composer anidado. No pinta `gallery`, `address`, lat/lng, `contactInfo`, `businessHours`, `secondaryCategories`, `isOnlineOnly`, `pricingTier`, `nextCursor`, `userReview`.
- Pago (D:1100-1323): segundo `Modal` sobre el pageSheet; «Copiar» solo vibra (D:1181,1241; `expo-clipboard` instalado); si falla la subida del comprobante envía `file://` (D:339-342); éxito con nombre vacío si vino de la parrilla.
- Estados: `ActivityIndicator` global; detalle/planes/reseñas sin error; sin pull-to-refresh; 1 `accessibilityLabel`.

## Datos
- `GET /public/directory/categories` (sin usar), `/entities?category_path&type&search&rating_min&verified_only&city&limit` (array, `cursor` declarado pero sin `nextCursor`), `/entities/:slug`, `/:id/reviews?sort_by&rating&limit`, `/:id/plans`, `/:id/payment-config`, `/plans?type&limit` (móvil solo `limit:50`), `POST /directory/payments/orders`, `/orders/:id/receipt`, `GET my-orders`, `/orders/:id` (sin UI). Reseñas: create/PATCH/DELETE/helpful (móvil solo create+helpful).
- Filtro cliente por subcadenas (`protein`, `creatina`, `polera`…, D:124-152); slugs `tiendas-nutricion` vs rutas `tiendas.nutricion` no coinciden. Sin `sort`. Sin `staleTime`. Clave `my-membership-directorio` duplica `['membership','me']`. Sin geolocalización.
- Deriva web/móvil: crear pedido `{order,paymentConfig}` vs `PaymentOrder`; mis pedidos `{items,total}` vs array; allowlist BFF web sin `/plans`, `/payment-config`, `/directory/payments/*`.

## Compra (tres flujos)
- A. Pedido de marketplace: crear → pagar fuera (QR bancario) → comprobante → verificación manual. Sin pasarela; web pide URL de comprobante. Sin «mis pedidos».
- B. Renovación del gimnasio (`membership.tsx`): 3 pasos, `renewal-intent` idempotente, QR + WhatsApp.
- C. «Ya pagué» (`membership-gate.tsx`): `activation-request` → enlace por WhatsApp → staff confirma en web `/activar/[token]`.
- Entradas con tres nombres: «Directorio y reseñas», «Directorio GymSheet», «Marketplace».

## Primitivas y tokens
- Usa `PressableScale`, `BackLink`, `Button`, `EmptyState`, `ErrorState`, `AmbientBackground`. No usa `ScreenHeader`, `Section`, `Card`, `Badge`, `Skeleton`, `BottomSheet`, `FilterChip`, `MediaImage`, `StickyFooter`, `Text`, `StepProgress`.
- `fontSizes.micro` ×20 (10 pt prohibido), 17 `fontWeight` literales, ~114 números, 58 volt, `accentHues`/`darkSurfaces` crudos, Unsplash, `'5.0'/'La Paz'/'Bolivia'/'Banco Registrado'/'N/D'`, emoji en copy, targets < 44 («Comprar QR», cerrar, copiar, chips), `StatusBar` hardcodeado ×3, 4 modales (2 anidados), estrellas triplicadas.
- Web: Tailwind crudo (`amber-500`, `font-black`), filtra 50 SSR en cliente, pero sí pinta galería/contacto/dirección.

## Tests
- Solo `marketplace-plans-section.test.tsx` (web, 2 casos). Móvil: ninguno. Sin e2e de `/directorio`.

## Huecos
- Solo frontend: debounce + servidor; categorías reales; hoja de filtros (servidor donde existe); ciudad/online + distancia en ficha; tarjeta honesta con `Intl`; ficha de producto como ruta (`getPlan`); perfil de vendedor como ruta con galería/horarios/contacto/mapa/reseñas ordenables y editar la propia; Mis compras; copiar real; comprobante obligatorio; guardados/recién vistos locales; estados; partir el archivo; arreglar deriva y allowlist.
- Backend: cursor en entities/plans; `search/sort/precio` en plans; geo; taxonomía/variantes/stock de producto; promociones; reseñas por producto; favoritos/recién vistos/sugerencias en servidor; señales de confianza del vendedor; chat comprador↔vendedor; pasarela/subida nativa de comprobante/carrito; gestión de anuncios del dueño; unificar los tres flujos de compra.
