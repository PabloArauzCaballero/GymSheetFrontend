// Las opciones viven en `@gymsheet/domain` porque el móvil hace las mismas
// preguntas con las mismas palabras. Este archivo solo re-exporta, para no
// tocar los imports existentes en este feature.
export { goalOptions, equipmentOptions, preferenceOptions } from '@gymsheet/domain';
