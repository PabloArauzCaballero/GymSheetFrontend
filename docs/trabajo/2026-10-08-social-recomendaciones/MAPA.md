# Mapa — personas por zona y gimnasios de la ciudad

Requisitos R34–R37; tareas [H6](fases/H06-mapa.md). La elección del usuario es A en las tres preguntas: zonas aproximadas, directorio externo más registrados y exploración de otras ciudades.

## Recorrido y estados

**Estado implementado:** backend ofrece celdas agregadas y una consulta autenticada de perfiles de celda; web y móvil tienen mapas iniciales con capas, búsqueda explícita tras mover el viewport, lista de perfiles autorizados y sedes GymSheet registradas. La consulta se revalida en servidor y su caché está separada por viewer. Falta geocodificar ciudades escritas, cargar POIs OSM externos, fallback accesible en lista y QA nativo real; la vista actual no afirma cobertura completa de gimnasios.

1. Conocer → Mapa. Seleccionar Personas/Gimnasios/Ambos; en primera entrada explicar visibilidad opcional del propio perfil.
2. Usar ciudad manual o ubicación permitida. Centrar cámara sin activar automáticamente «Aparecer en mapa».
3. Arrastrar/zoom. Mantener resultados actuales atenuados hasta «Buscar en esta zona»; al buscar, cancelar consulta previa y fijar `searchVersion`.
4. Tocar grupo de personas → hoja/lista de perfiles filtrados → perfil → conectar. La zona no es una lista de asistentes actuales al gimnasio.
5. Tocar gimnasio → ficha con ubicación y procedencia, distintivo registrado/externo, navegación externa. No afirmar que todos los establecimientos de la ciudad están inventariados.
6. Volver a mi zona restaura cámara/contexto; nunca escribe una ubicación explorada como si fuera la ubicación del usuario.

Estados exigidos: ubicación denegada, sin zona elegida, cargando, zona con personas, sin candidatos, solo gimnasios, fuente externa caída, tiles caídos, respuesta vieja descartada, opt-out recién aplicado, conectividad recuperada. Cada estado tiene alternativa en lista y acción de recuperación.

## Consulta y privacidad

- Ingestar ubicación privada separada del DTO social. Registrar precisión/origen/fecha de actualización. Datos manuales son centros de zona, no GPS ficticio.
- Indexar personas por celda pública de aproximadamente 2 km como mínimo; el tamaño es decisión técnica inicial. El servidor devuelve IDs opacos de celda y su geometría pública. Ningún zoom de cliente recibe puntos individuales precisos.
- Una celda de baja densidad sigue siendo zona aproximada, nunca el domicilio. No afirmar anonimato de grupo: al abrir la lista se muestran perfiles autorizados. Con consentimiento del dueño, limitar datos a esa zona aproximada.
- Calcular pertenencia por celda; recortar bboxes no revela coordenada original. Distancias públicas en bandas aproximadas. Rate limit y queries normalizadas por celda impiden sondeo arbitrario a precisión de metros.
- Ordenar lista de zona con el mismo motor y política que Conocer. El backend vuelve a filtrar opt-in, pausa, bloqueo, edad y género en cada página.
- No enviar coordenadas de usuarios a proveedor de POIs ni a logs. Abrir una navegación de gimnasio puede compartir ese destino con la app de mapas por acción expresa.

## Directorio externo y render

**Decisión técnica H6.S2.M1:** los gimnasios externos se obtienen del PBF regional de Geofabrik/OpenStreetMap y se importan a un índice propio; para Bolivia está disponible el [extracto de Geofabrik](https://download.geofabrik.de/south-america/bolivia.html). Los extractos derivados de OSM están bajo ODbL y exigen atribución; toda vista de mapa incluye “© OpenStreetMap contributors” con enlace a [copyright/licencia](https://www.openstreetmap.org/copyright). Geofabrik declara la licencia y atribución en sus [condiciones de descarga](https://www.geofabrik.de/data/download.html). El snapshot `bolivia-261008` se extrajo e importó a una PostgreSQL QA: 6,746 asentamientos y 201 gimnasios etiquetados; 52 gimnasios caen en el área de cobertura de La Paz probada y la API devolvió 33 en el recuadro más pequeño del E2E. El manifiesto con URL, fecha UTC, tamaño, checksum, tags, licencia, atribución y bbox está en [osm-bolivia-261008.manifest.json](evidencia/osm-bolivia-261008.manifest.json); pruebas y límites están en [backend-social-map-places.txt](evidencia/backend-social-map-places.txt). Esta cobertura observada no implica inventario exhaustivo de todos los establecimientos.

Para reproducir la importación desde `GymSheetBackend`:

```sh
python3 -m venv /tmp/gs-osm-venv
/tmp/gs-osm-venv/bin/pip install -r scripts/qa/requirements-social-map.txt
curl -L --fail --output /tmp/bolivia-261008.osm.pbf https://download.geofabrik.de/south-america/bolivia-261008.osm.pbf
/tmp/gs-osm-venv/bin/python scripts/qa/extract-osm-social-places.py /tmp/bolivia-261008.osm.pbf --output /tmp/bolivia-261008-social-places.ndjson --manifest /tmp/bolivia-261008-social-places.manifest.json
yarn db:import:social-map --input /tmp/bolivia-261008-social-places.ndjson --manifest /tmp/bolivia-261008-social-places.manifest.json
```

La importación valida el manifiesto y todas las filas antes de abrir la transacción. Una ejecución completa marca los POIs OSM anteriores como inactivos, hace upsert por `(source, sourceId, kind)` y reactiva los del snapshot nuevo; una falla revierte todo. El extractor toma nodos y vías con etiquetas verificables, conserva dirección disponible y calcula un centro aproximado para vías cerradas. No reconstruye relaciones administrativas; los asentamientos se buscan por los puntos y vías etiquetados que estén presentes en el extracto.

Manifiesto obligatorio: source URL, descarga UTC, versión, checksum, licencia/atribución, bbox, tags seleccionados y conteos. Selección inicial de POIs por tags de gimnasio/centro fitness documentados durante H6.S2.M1; no inventar nombres ni geocodificar direcciones de memoria. Actualizaciones conservan `sourceId`; cierres se marcan, no se pierden vínculos con sedes existentes. Cobertura insuficiente se registra y puede resolverse con proveedor contratado mediante el mismo adaptador.

Separar tres decisiones: dataset de establecimientos, geocodificación de ciudad y tiles de fondo. Un único SDK no resuelve automáticamente las tres. Evitar depender del [Nominatim público para autocompletado o extracción de POIs](https://operations.osmfoundation.org/policies/nominatim/). Las condiciones de [tiles OSM](https://operations.osmfoundation.org/policies/tiles/) exigen revisión antes de usar su infraestructura pública en una app comercial.

Web conserva React Leaflet; en producción necesita `NEXT_PUBLIC_MAP_TILE_URL` y atribución del proveedor en `NEXT_PUBLIC_MAP_TILE_ATTRIBUTION`. Sin proveedor, el fondo no carga y la búsqueda/lista sigue disponible. Móvil usa `react-native-maps` detrás del adaptador; la [documentación oficial de Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/map-view/) recomienda 1.27.2 y documenta Apple Maps en iOS/Google Maps en Android. La compilación standalone requiere configurar Google Maps y una clave restringida en Android; Expo Go no demuestra que el build esté listo. No usar los tiles ni Nominatim públicos de OSM como backend gratuito para una app comercial: el índice POI propio es distinto del proveedor de tiles. No se exponen claves de servidor en el bundle. El API E2E del catálogo pasó contra PostgreSQL; build/runtime nativo y cobertura en otras ciudades siguen pendientes.

## Límites iniciales propuestos

Consulta de personas: hasta 100 celdas por respuesta, 20 perfiles por página, bbox máximo por request equivalente a 100 km de ancho; al alejarse más se agrupan ciudades/zonas y se invita a acercarse. Directorio gyms: hasta 200 puntos visibles, clustering a escalas amplias. Los límites se validan en servidor; no descargar toda la comunidad al teléfono.

Cache por zona, capa, viewer y preferenceVersion; nunca compartir cache de personas entre usuarios. Cache de establecimientos se puede compartir, con `updatedAt` y origen. Opt-out/bloqueo invalida persona y respuestas derivadas; réplica obsoleta se filtra al servir.

## DoD y kill-tests

- Persona opt-out no aparece por API, lista ni marcador; no basta esconder icono en UI.
- Explorar otra ciudad no cambia la ubicación de perfil consultada directamente desde BD.
- Dos queries con bboxes que difieren por metros no permiten obtener una coordenada individual.
- Directorio real documentado aporta al menos un establecimiento verificable en ciudad de QA; fixtures sintéticos solo prueban render y dedupe.
- A/B de gimnasios distintos se encuentran por zona, conectan y ven el mismo estado desde tarjeta y reel.
- Una sola búsqueda activa gana a respuestas atrasadas. Capas, lista alternativa, lector de pantalla y GPS denegado se prueban en Android/iOS/web.
