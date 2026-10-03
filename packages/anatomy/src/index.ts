/**
 * La figura anatómica, sin interfaz: las zonas de cada músculo trazadas sobre
 * las láminas, la detección del toque, la geometría de zoom y el catálogo de
 * músculos. La consumen el móvil (React Native + SVG) y la web (DOM + SVG), y
 * por eso no importa nada de ninguna de las dos: lo que se ilumina y lo que se
 * detecta es el mismo contorno en las dos apps.
 */
export * from './types';
export * from './hit-test';
export * from './view-transform';
export * from './region-fit';
export * from './highlight';
export { AGGREGATES, MUSCLES, muscleInfo, musclesByGroup } from './muscle-catalog';
export type { MuscleGroupInfo, MuscleInfo } from './muscle-catalog';
export { IMAGE_ASPECT, REGIONS, REGION_VIEWBOX } from './regions.generated';
