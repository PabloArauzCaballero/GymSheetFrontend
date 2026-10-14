/**
 * Zona o músculo del catálogo → músculos de la lámina anatómica. La tarjeta
 * enseña el cuerpo con esa zona encendida: es la respuesta más rápida a «¿es
 * esta?» y no depende de la foto que mande el servidor (en TEST la «imagen» de
 * cada zona es un vídeo, que no se puede pintar como imagen y dejaba la placa
 * en blanco). Sin coincidencia, la tarjeta usa el icono.
 */
const ZONE_MUSCLES: ReadonlyArray<readonly [RegExp, readonly string[]]> = [
  [/glute|gl[uú]teo/i, ['GLUTEUS_MAXIMUS', 'GLUTEUS_MEDIUS']],
  [/quad|cu[aá]driceps/i, ['QUADRICEPS']],
  [/hamstring|isquio|femoral/i, ['HAMSTRINGS']],
  [/adductor|aductor|aducci[oó]n|copenhag/i, ['ADDUCTORS']],
  [/abductor|abducci[oó]n/i, ['ABDUCTORS']],
  [/calf|calves|lower leg|pantorrilla|gemelo/i, ['GASTROCNEMIUS', 'SOLEUS']],
  [/upper leg|pierna|tren inferior|leg/i, ['QUADRICEPS', 'HAMSTRINGS', 'ADDUCTORS', 'GLUTEUS_MAXIMUS']],
  [/bicep/i, ['BICEPS_BRACHII', 'BRACHIALIS']],
  [/tricep/i, ['TRICEPS_BRACHII']],
  [/forearm|lower arm|antebrazo/i, ['FOREARM_FLEXORS', 'FOREARM_EXTENSORS', 'BRACHIORADIALIS']],
  [/upper arm|brazo/i, ['BICEPS_BRACHII', 'TRICEPS_BRACHII', 'BRACHIALIS']],
  [/lat|dorsal/i, ['LATISSIMUS_DORSI']],
  [/trap/i, ['TRAPEZIUS']],
  [/spine|erector|lumbar/i, ['ERECTOR_SPINAE']],
  [/upper back|romboid/i, ['RHOMBOIDS', 'TRAPEZIUS', 'TERES_MAJOR', 'INFRASPINATUS']],
  [/back|espalda|cadena posterior|posterior/i, ['LATISSIMUS_DORSI', 'TRAPEZIUS', 'ERECTOR_SPINAE', 'RHOMBOIDS']],
  [/serratus|serrato/i, ['SERRATUS_ANTERIOR']],
  [/chest|pecho|pector/i, ['PECTORALIS_MAJOR', 'PECTORALIS_MINOR']],
  [/abs\b|waist|core|abdom|cintura|plancha|plank|crunch/i, ['RECTUS_ABDOMINIS', 'OBLIQUES']],
  [/delt|shoulder|hombro/i, ['DELTOID']],
  [/levator|neck|cuello/i, ['LEVATOR_SCAPULAE', 'STERNOCLEIDOMASTOID']],
  [/tren superior|upper/i, ['PECTORALIS_MAJOR', 'DELTOID', 'BICEPS_BRACHII', 'LATISSIMUS_DORSI']],
];

export function zoneMuscles(name: string): readonly string[] | null {
  return ZONE_MUSCLES.find(([pattern]) => pattern.test(name))?.[1] ?? null;
}

