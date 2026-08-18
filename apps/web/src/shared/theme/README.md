# Tema e identidad por inquilino

Los colores de la aplicación web son configurables sin tocar código ni CSS.
Esta carpeta es la única que contiene valores de color; el resto del código
consume variables CSS.

## Cómo encaja

1. `color-contract.ts` — enumera cada variable de color que el estilo consume y
   la asocia a una clave tipada. Añadir un color nuevo empieza aquí.
2. `default-palette.ts` — la identidad GymSheet (oscura y clara). Es la
   referencia y el respaldo de cualquier identidad parcial.
3. `tenant-palette.ts` — lee el registro de inquilinos de configuración, lo
   valida y combina cada identidad parcial sobre la de referencia.
4. `build-theme-css.ts` — convierte una paleta en el bloque de variables.
5. `tenant-theme.server.ts` — resuelve la identidad del host de la petición.

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
    "name": "LiftHouse",
    "dark":  { "accent": "#ff5a1f", "accentInk": "#ff7a4a", "accentContrast": "#1a0a03" },
    "light": { "accent": "#ff5a1f", "accentInk": "#b3400f", "accentContrast": "#ffffff" }
  }
}
```

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
base con tolerancia de cero píxeles. Es la red que garantiza que mover colores
de sitio no cambia el aspecto. Regenerar la base sólo cuando el cambio visual
sea deliberado (`--update-snapshots`).

Para ver dos identidades lado a lado:

```
TENANT_THEMES="$(cat .e2e-assets/tenant-themes.json)" yarn dev
node scripts/capture-tenant-themes.mjs
```

## Pendiente para multi-inquilino completo

Esta fase cubre **color**. Siguen fijos en el código y son el siguiente paso
natural: el nombre del producto y el texto de los tutoriales («GymSheet»), la
marca gráfica (`brand-mark.svg`), la tipografía y las copias de bienvenida.
