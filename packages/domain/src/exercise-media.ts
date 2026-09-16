/**
 * Qué demostración de un ejercicio se le enseña a cada persona.
 *
 * El catálogo guarda hasta cuatro vídeos por ejercicio —MP4 y WebM, en cuerpo
 * de hombre y de mujer— y la app tiene que elegir uno. La regla vive aquí, en
 * `domain`, y no en cada app, porque una divergencia entre web y móvil se ve
 * como un fallo de producto: la misma cuenta, el mismo ejercicio y dos cuerpos
 * distintos según el dispositivo.
 *
 * La variante viaja en `metadata.variant` de cada fila, no en el nombre del
 * archivo: el objeto se nombra por el hash de su contenido para no duplicar el
 * mismo binario (ver PLAN-VIDEOS-EJERCICIOS §5).
 */

export type ExerciseMediaVariant = 'hombre' | 'mujer' | 'neutro';

/** Género del perfil tal y como lo declara el backend. */
export type ProfileGender = 'MALE' | 'FEMALE' | 'UNSPECIFIED' | null | undefined;

/**
 * Lo mínimo que esta lógica necesita de una fila de media. Deliberadamente
 * estructural y no el tipo del esquema: así `domain` no depende de `schemas` y
 * las dos apps pueden pasar lo que ya tienen.
 */
export interface ExerciseMediaLike {
  readonly mediaType: 'IMAGE' | 'GIF' | 'VIDEO';
  readonly url: string;
  readonly thumbnailUrl: string | null;
  readonly mimeType: string | null;
  readonly altText: string;
  readonly isPrimary: boolean;
  readonly sortOrder: number;
  readonly status: 'ACTIVE' | 'INACTIVE';
  readonly metadata?: Record<string, unknown> | null;
}

/**
 * Variante declarada por la fila, normalizada.
 *
 * Se compara en minúsculas a propósito: el endpoint de subida acepta
 * `HOMBRE/MUJER/NEUTRO` y el plan documenta `hombre/mujer`. Atarse a una de las
 * dos grafías dejaría media biblioteca sin encontrar, y el fallo sería
 * silencioso: se vería el vídeo de siempre, no un error.
 */
export function mediaVariantOf(media: ExerciseMediaLike): ExerciseMediaVariant | null {
  const raw = media.metadata?.variant;
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toLowerCase();
  if (value === 'hombre' || value === 'mujer' || value === 'neutro') return value;
  return null;
}

/** La variante que le corresponde a un perfil. Sin género declarado no hay preferencia. */
export function variantForGender(gender: ProfileGender): ExerciseMediaVariant | null {
  if (gender === 'MALE') return 'hombre';
  if (gender === 'FEMALE') return 'mujer';
  return null;
}

/**
 * Orden de lectura del catálogo: primero la principal, luego `sortOrder`, y a
 * igualdad se respeta el orden en que llegó. Es el mismo criterio que usa el
 * backend al listar, para que la app no reordene lo que el gimnasio decidió.
 */
function byCatalogOrder(a: ExerciseMediaLike, b: ExerciseMediaLike): number {
  if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
  return a.sortOrder - b.sortOrder;
}

function activeMedia(media: readonly ExerciseMediaLike[]): ExerciseMediaLike[] {
  return media.filter((item) => item.status === 'ACTIVE').sort(byCatalogOrder);
}

/**
 * La demostración que se muestra: la de la variante del perfil si existe; si no,
 * la marcada como principal; y si tampoco, la primera activa.
 *
 * Nunca inventa: con la lista vacía —que hoy es el caso de casi todo el
 * catálogo— devuelve `null`, y la pantalla debe quedarse exactamente como está
 * sin hueco reservado.
 */
export function selectExerciseMedia(
  media: readonly ExerciseMediaLike[],
  gender: ProfileGender,
): ExerciseMediaLike | null {
  const candidates = activeMedia(media);
  if (candidates.length === 0) return null;

  const wanted = variantForGender(gender);
  if (wanted) {
    const match = candidates.find((item) => mediaVariantOf(item) === wanted);
    if (match) return match;
  }

  return candidates.find((item) => item.isPrimary) ?? candidates[0] ?? null;
}

/** Una fuente reproducible, en el orden en que debe ofrecerse al reproductor. */
export interface ExerciseVideoSource {
  readonly url: string;
  readonly mimeType: string;
}

export interface ExerciseVideoSelection {
  readonly variant: ExerciseMediaVariant | null;
  readonly altText: string;
  readonly poster: string | null;
  /** WebM primero: mismo clip, la mitad de bytes donde el navegador lo admita. */
  readonly sources: readonly ExerciseVideoSource[];
  /** MP4, que es lo que reproduce cualquier plataforma. */
  readonly mp4Url: string | null;
}

/** Deduce el tipo cuando la fila no lo trae, para no dejar un `<source>` sin `type`. */
function mimeOf(media: ExerciseMediaLike): string {
  if (media.mimeType) return media.mimeType.toLowerCase();
  return media.url.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4';
}

/**
 * El vídeo de la variante que toca, con sus dos formatos.
 *
 * Devuelve las fuentes juntas —WebM y MP4 del MISMO cuerpo— porque son el mismo
 * clip codificado dos veces: dejar que el navegador elija es lo que ahorra
 * ancho de banda sin arriesgar que alguien se quede sin verlo. Mezclar formatos
 * de variantes distintas enseñaría un cuerpo u otro según el navegador.
 */
export function selectExerciseVideo(
  media: readonly ExerciseMediaLike[],
  gender: ProfileGender,
): ExerciseVideoSelection | null {
  const videos = activeMedia(media).filter((item) => item.mediaType === 'VIDEO');
  if (videos.length === 0) return null;

  const chosen = selectExerciseMedia(videos, gender);
  if (!chosen) return null;

  const variant = mediaVariantOf(chosen);
  // Las demás piezas del mismo cuerpo: el otro formato del mismo render.
  const sameVariant = videos.filter((item) => mediaVariantOf(item) === variant);
  const group = sameVariant.length > 0 ? sameVariant : [chosen];

  const webm = group.filter((item) => mimeOf(item) === 'video/webm');
  const mp4 = group.filter((item) => mimeOf(item) !== 'video/webm');
  const ordered = [...webm, ...mp4];

  return {
    variant,
    altText: chosen.altText,
    poster: chosen.thumbnailUrl ?? group.find((item) => item.thumbnailUrl)?.thumbnailUrl ?? null,
    sources: ordered.map((item) => ({ url: item.url, mimeType: mimeOf(item) })),
    mp4Url: mp4[0]?.url ?? null,
  };
}

/** Una imagen fija para listados y tarjetas, con su texto alternativo. */
export interface ExercisePoster {
  readonly url: string;
  readonly altText: string;
}

/**
 * La imagen fija de un ejercicio: lo único que se sirve en listados.
 *
 * Un listado nunca descarga vídeo (PLAN-VIDEOS-EJERCICIOS §4.3): son 1,9 MB por
 * pieza contra 0,12 MB del póster, y una rejilla de doce tarjetas decidiría el
 * consumo del mes. Se prefiere la lámina del catálogo, que es lo que hoy tienen
 * los 1.324 ejercicios, y solo si no hay se usa el póster del vídeo: así añadir
 * vídeos no cambia el aspecto de ninguna pantalla que ya funciona.
 */
export function selectExercisePoster(
  media: readonly ExerciseMediaLike[],
  gender: ProfileGender,
): ExercisePoster | null {
  const candidates = activeMedia(media);
  const still = candidates.find(
    (item) => item.mediaType === 'IMAGE' || item.mediaType === 'GIF',
  );
  if (still) {
    return { url: still.thumbnailUrl ?? still.url, altText: still.altText };
  }

  const video = selectExerciseVideo(candidates, gender);
  if (video?.poster) return { url: video.poster, altText: video.altText };
  return null;
}
