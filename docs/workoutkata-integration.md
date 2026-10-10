# Integración externa

No existe una integración identificada como WorkoutKata en el código o configuración.
La fuente implementada es `hasaneyldrm/exercises-dataset` y está aislada en client,
schemas Zod, service y repository. Descarga una instantánea HTTPS desde host permitido,
valida tamaño/tipo/estructura, normaliza, persiste por lotes y conserva external ID,
checksum, fuente y fecha de sincronización. Es idempotente y sirve desde PostgreSQL.

La importación está desactivada por defecto. La multimedia requiere confirmación explícita
de licencia. Endpoint: `POST /api/v1/admin/exercises/import/exercises-dataset`.

## De dónde salen los ejercicios que ve la app

Desde 2026-09-16 no hace falta importar nada para que la pantalla de ejercicios tenga contenido:
el backend siembra el catálogo al arrancar desde un snapshot versionado en su repo
(`src/database/seeders/boot/exercises.snapshot.json.gz`), con 1.324 ejercicios, su descripción en
español y sus instrucciones por idioma. Es lo que alimenta la lámina de cada ejercicio, el buscador
y el detalle, también en un entorno recién creado y sin salida a internet.

La importación externa sigue siendo la vía para **actualizar** ese catálogo; el snapshot es el punto
de partida. Si la pantalla de ejercicios apareciera vacía, el dato a mirar es
`CANONICAL_EXERCISES_SOURCE` en el backend: con `github` el arranque no siembra y espera al worker.
