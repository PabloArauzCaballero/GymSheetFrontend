import {
  mediaVariantOf,
  selectExerciseMedia,
  selectExercisePoster,
  selectExerciseVideo,
  type ExerciseMediaLike,
} from '@gymsheet/domain';
import { describe, expect, it } from 'vitest';

/**
 * La regla que decide qué cuerpo ve cada persona. Vive en `domain` y la usan
 * las dos aplicaciones, así que lo que se fija aquí es el contrato compartido:
 * si esto cambia sin querer, web y móvil enseñan demostraciones distintas a la
 * misma cuenta.
 */

function video(
  overrides: Partial<ExerciseMediaLike> & { variant?: string | null },
): ExerciseMediaLike {
  const { variant, ...rest } = overrides;
  return {
    mediaType: 'VIDEO',
    url: 'https://media.test/clip.mp4',
    thumbnailUrl: 'https://media.test/clip.webp',
    mimeType: 'video/mp4',
    altText: 'Demostración',
    isPrimary: false,
    sortOrder: 0,
    status: 'ACTIVE',
    metadata: variant === undefined ? {} : { variant },
    ...rest,
  };
}

const mp4Hombre = video({
  url: 'https://media.test/hombre.mp4',
  variant: 'hombre',
  isPrimary: true,
  sortOrder: 0,
});
const webmHombre = video({
  url: 'https://media.test/hombre.webm',
  mimeType: 'video/webm',
  variant: 'hombre',
  sortOrder: 1,
});
const mp4Mujer = video({
  url: 'https://media.test/mujer.mp4',
  variant: 'mujer',
  sortOrder: 10,
});
const webmMujer = video({
  url: 'https://media.test/mujer.webm',
  mimeType: 'video/webm',
  variant: 'mujer',
  sortOrder: 11,
});

const catalogo = [mp4Hombre, webmHombre, mp4Mujer, webmMujer];

describe('selectExerciseMedia', () => {
  it('elige la variante que corresponde al género del perfil', () => {
    expect(selectExerciseMedia(catalogo, 'FEMALE')?.url).toBe(mp4Mujer.url);
    expect(selectExerciseMedia(catalogo, 'MALE')?.url).toBe(mp4Hombre.url);
  });

  /** Sin género declarado no se adivina: manda lo que el gimnasio marcó como principal. */
  it('cae a la principal cuando el perfil no declara género', () => {
    expect(selectExerciseMedia(catalogo, 'UNSPECIFIED')?.url).toBe(mp4Hombre.url);
    expect(selectExerciseMedia(catalogo, null)?.url).toBe(mp4Hombre.url);
  });

  it('cae a la principal cuando no existe la variante pedida', () => {
    const soloHombre = [mp4Hombre, webmHombre];
    expect(selectExerciseMedia(soloHombre, 'FEMALE')?.url).toBe(mp4Hombre.url);
  });

  it('cae a la primera activa cuando ninguna es principal', () => {
    const sinPrincipal = [
      video({ url: 'https://media.test/a.mp4', sortOrder: 5, variant: null }),
      video({ url: 'https://media.test/b.mp4', sortOrder: 1, variant: null }),
    ];
    // Ordena por `sortOrder`, igual que el backend al listar.
    expect(selectExerciseMedia(sinPrincipal, 'MALE')?.url).toBe('https://media.test/b.mp4');
  });

  it('con la lista vacía devuelve nada, y la pantalla se queda como estaba', () => {
    expect(selectExerciseMedia([], 'MALE')).toBeNull();
  });

  it('ignora lo inactivo', () => {
    const inactivo = [{ ...mp4Mujer, status: 'INACTIVE' as const }, mp4Hombre];
    expect(selectExerciseMedia(inactivo, 'FEMALE')?.url).toBe(mp4Hombre.url);
  });
});

describe('mediaVariantOf', () => {
  /**
   * El endpoint de subida acepta `MUJER` y el plan escribe `mujer`. Las dos
   * grafías tienen que valer: atarse a una dejaría media biblioteca sin
   * encontrar, y en silencio.
   */
  it('lee la variante sin importar mayúsculas ni espacios', () => {
    expect(mediaVariantOf(video({ variant: 'MUJER' }))).toBe('mujer');
    expect(mediaVariantOf(video({ variant: ' Hombre ' }))).toBe('hombre');
  });

  it('descarta un valor que no es una variante', () => {
    expect(mediaVariantOf(video({ variant: 'otro' }))).toBeNull();
    expect(mediaVariantOf(video({ variant: null }))).toBeNull();
  });
});

describe('selectExerciseVideo', () => {
  it('agrupa los dos formatos del MISMO cuerpo, con WebM primero', () => {
    const seleccion = selectExerciseVideo(catalogo, 'FEMALE');
    expect(seleccion?.variant).toBe('mujer');
    expect(seleccion?.sources.map((source) => source.url)).toEqual([
      webmMujer.url,
      mp4Mujer.url,
    ]);
    // El móvil se queda con MP4: iOS no decodifica WebM.
    expect(seleccion?.mp4Url).toBe(mp4Mujer.url);
  });

  it('no mezcla el WebM de un cuerpo con el MP4 del otro', () => {
    const seleccion = selectExerciseVideo(catalogo, 'MALE');
    expect(seleccion?.sources.every((source) => source.url.includes('hombre'))).toBe(true);
  });

  it('deduce el tipo por la extensión cuando la fila no lo trae', () => {
    const sinMime = [video({ url: 'https://media.test/x.webm', mimeType: null, variant: null })];
    expect(selectExerciseVideo(sinMime, null)?.sources[0]?.mimeType).toBe('video/webm');
  });

  it('sin vídeos devuelve nada', () => {
    const soloImagen: ExerciseMediaLike[] = [
      { ...mp4Hombre, mediaType: 'IMAGE', mimeType: 'image/jpeg' },
    ];
    expect(selectExerciseVideo(soloImagen, 'MALE')).toBeNull();
  });
});

describe('selectExercisePoster', () => {
  /** El catálogo de hoy tiene lámina: añadir vídeos no debe cambiar ningún listado. */
  it('prefiere la lámina del catálogo', () => {
    const conLamina: ExerciseMediaLike[] = [
      {
        ...mp4Hombre,
        mediaType: 'IMAGE',
        url: 'https://media.test/lamina.jpg',
        thumbnailUrl: null,
        altText: 'Lámina',
      },
      mp4Mujer,
    ];
    expect(selectExercisePoster(conLamina, 'FEMALE')?.url).toBe('https://media.test/lamina.jpg');
  });

  it('usa el póster del vídeo cuando no hay lámina', () => {
    expect(selectExercisePoster(catalogo, 'MALE')?.url).toBe(mp4Hombre.thumbnailUrl);
  });

  it('sin nada que mostrar devuelve nada', () => {
    expect(selectExercisePoster([], 'MALE')).toBeNull();
  });
});
