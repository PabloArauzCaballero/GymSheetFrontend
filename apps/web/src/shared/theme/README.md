# Tema e identidad por inquilino

La identidad visual de la aplicación web —colores, nombre, marca gráfica y
tipografía— es configurable sin tocar código. Esta carpeta es la única que
contiene valores de identidad; el resto del código consume variables CSS y el
contexto de marca.

## Cómo encaja

1. `color-contract.ts` — cada variable de color que el estilo consume, asociada
   a una clave tipada. Añadir un color nuevo empieza aquí.
2. `brand-contract.ts` — nombre, rótulo, monograma y los catálogos cerrados de
   glifo y tipografía.
3. `default-palette.ts` — la identidad GymSheet (oscura y clara). Es la
   referencia y el respaldo de cualquier identidad parcial.
4. `tenant-palette.ts` — lee el registro de inquilinos, lo valida y combina cada
   identidad parcial sobre la de referencia.
5. `build-theme-css.ts` — convierte un tema en el bloque de variables.
6. `tenant-theme.server.ts` — resuelve la identidad del host de la petición.
7. `brand-provider.tsx` — expone la marca al árbol de cliente (`useBrand`,
   `useBrandCopy`).
8. `brand-fonts.ts` — carga las familias con `next/font`; `brand-icons.tsx`
   mapea las claves de glifo a componente.

El layout raíz inyecta el resultado en `<head>`. Al renderizarse en el servidor
llega con el documento, así que no hay un instante en que la página se pinte con
la marca equivocada.

## Configurar un inquilino

Variable de entorno `TENANT_THEMES`: un JSON que asocia host a identidad. Cada
identidad es **parcial**: lo que no se declara se hereda de la paleta de
referencia, que es lo habitual y lo que mantiene la coherencia entre marcas.

```json
{
  "lifthouse.gymsheet.app": {
    "id": "lifthouse",
    "brand": { "name": "LiftHouse", "monogram": "LH", "icon": "flame", "font": "manrope" },
    "dark":  { "accent": "#ff5a1f", "accentInk": "#ff7a4a", "accentContrast": "#1a0a03" },
    "light": { "accent": "#ff5a1f", "accentInk": "#b3400f", "accentContrast": "#ffffff" }
  }
}
```

`name` también se acepta en la raíz como atajo. Si no se declara `wordmark`, se
usa el nombre en versales.

Glifo y tipografía se eligen de un catálogo cerrado (`brandIconKeys`,
`brandFontKeys`). Un SVG libre habría que incrustarlo en el documento y podría
romper el encuadre; una familia libre exigiría descargarla en ejecución, con
salto visual al cargar.

Las copias de producto nombran al gimnasio con el marcador `{marca}` —ver
`intro.ts` de tutoriales—, que `useBrandCopy` resuelve al pintar.

Un JSON inválido o con claves fuera del contrato **detiene el arranque**: servir
la marca equivocada a un inquilino es peor que fallar de forma visible.

Al menos `accent` y `accentContrast` conviene declararlos juntos: el segundo es
el texto que va encima del relleno de acento, y un acento claro con texto claro
deja botones ilegibles. El contraste no se deriva automáticamente porque la
decisión depende de la marca.

## Reglas

- **Ningún color literal fuera de esta carpeta.** `scripts/source-check.mjs` lo
  verifica en cada validación; falla ante un hex o un `rgb()` con canales
  numéricos en `src/`. La excepción son las máscaras (`mask-image`), donde el
  color expresa opacidad y no identidad.
- Para componer una opacidad del acento se usan los canales:
  `rgb(var(--accent-channels) / 0.55)`. Así una opacidad nueva no obliga a
  declarar una variable nueva. Existen también `--scrim-channels` y
  `--sheen-channels`.
- Los radios **no** son configurables: son proporción y ritmo, no identidad, y
  viven en `globals.css`.

## Verificación

`e2e/theme-parity.spec.ts` compara cada pantalla en ambos temas contra una línea
base con tolerancia de cero píxeles. Es la red que garantiza que mover la
identidad de sitio no cambia el aspecto. Regenerar la base sólo cuando el cambio
visual sea deliberado (`--update-snapshots`).

Las pantallas que listan registros se comparan por su encabezado, no completas:
crecen cada vez que alguien da de alta algo —las propias pruebas funcionales lo
hacen— y una captura completa dejaría de coincidir por motivos ajenos al tema.

Para ver dos identidades lado a lado:

```
TENANT_THEMES="$(cat .e2e-assets/tenant-themes.json)" yarn dev
node scripts/capture-tenant-themes.mjs
```

## Superficies que ya siguen al inquilino

Interfaz, título de la pestaña, manifiesto de instalación, color de la barra del
sistema, marca gráfica (`/brand-mark.svg`, generada por petición) y la
atribución de los medios que sube la consola.

`global-error.tsx` es la excepción deliberada: sustituye al documento entero
cuando falla el layout raíz, así que lleva su propia copia de la identidad de
referencia. Si algo se rompió tan arriba, la resolución del inquilino es
sospechosa y arriesgar una segunda caída no compensa.

## Pendiente

Los textos comerciales de la pantalla de acceso («Cada serie. Cada decisión.»)
y la descripción del producto siguen siendo del sistema, no del inquilino.
