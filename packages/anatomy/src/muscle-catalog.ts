/**
 * Músculos de la figura, con su nombre en español y en latín.
 *
 * Es copia de `muscle-taxonomy.ts` del backend (la fuente de verdad), guardada
 * aquí para que la etiqueta salga en el instante del toque sin esperar a la red.
 * Solo se usa para esa etiqueta y para la lista; la pantalla de detalle pide el
 * músculo a la API, de modo que un nombre cambiado en el backend se ve bien allí
 * aunque esta copia se quede atrás.
 */

export interface MuscleGroupInfo {
  readonly code: string;
  readonly name: string;
}

export interface MuscleInfo {
  readonly code: string;
  readonly name: string;
  readonly latinName: string;
  readonly group: MuscleGroupInfo;
}

const CHEST = { code: 'CHEST', name: 'Pecho' } as const;
const BACK = { code: 'BACK', name: 'Espalda' } as const;
const SHOULDERS = { code: 'SHOULDERS', name: 'Hombros' } as const;
const ARMS = { code: 'ARMS', name: 'Brazos' } as const;
const CORE = { code: 'CORE', name: 'Core / Abdomen' } as const;
const LEGS = { code: 'LEGS', name: 'Piernas' } as const;
const GLUTES = { code: 'GLUTES', name: 'Glúteos' } as const;
const CALVES = { code: 'CALVES', name: 'Pantorrillas' } as const;
const NECK = { code: 'NECK', name: 'Cuello' } as const;

/** Orden de los grupos en la lista: de arriba abajo en el cuerpo. */
export const GROUP_ORDER: readonly MuscleGroupInfo[] = [
  NECK,
  SHOULDERS,
  CHEST,
  ARMS,
  BACK,
  CORE,
  GLUTES,
  LEGS,
  CALVES,
];

export const MUSCLES: readonly MuscleInfo[] = [
  { code: 'PECTORALIS_MAJOR', name: 'Pectoral mayor', latinName: 'Pectoralis major', group: CHEST },
  { code: 'PECTORALIS_MINOR', name: 'Pectoral menor', latinName: 'Pectoralis minor', group: CHEST },
  { code: 'SERRATUS_ANTERIOR', name: 'Serrato anterior', latinName: 'Serratus anterior', group: CHEST },
  { code: 'LATISSIMUS_DORSI', name: 'Dorsal ancho', latinName: 'Latissimus dorsi', group: BACK },
  { code: 'TRAPEZIUS', name: 'Trapecio', latinName: 'Trapezius', group: BACK },
  { code: 'RHOMBOIDS', name: 'Romboides', latinName: 'Rhomboidei', group: BACK },
  { code: 'ERECTOR_SPINAE', name: 'Erectores espinales', latinName: 'Erector spinae', group: BACK },
  { code: 'TERES_MAJOR', name: 'Redondo mayor', latinName: 'Teres major', group: BACK },
  { code: 'INFRASPINATUS', name: 'Infraespinoso', latinName: 'Infraspinatus', group: BACK },
  { code: 'DELTOID', name: 'Deltoides', latinName: 'Deltoideus', group: SHOULDERS },
  { code: 'DELTOID_ANTERIOR', name: 'Deltoides anterior', latinName: 'Deltoideus pars clavicularis', group: SHOULDERS },
  { code: 'DELTOID_LATERAL', name: 'Deltoides lateral', latinName: 'Deltoideus pars acromialis', group: SHOULDERS },
  { code: 'DELTOID_POSTERIOR', name: 'Deltoides posterior', latinName: 'Deltoideus pars spinalis', group: SHOULDERS },
  { code: 'ROTATOR_CUFF', name: 'Manguito rotador', latinName: 'Musculi rotatores', group: SHOULDERS },
  { code: 'LEVATOR_SCAPULAE', name: 'Elevador de la escápula', latinName: 'Levator scapulae', group: SHOULDERS },
  { code: 'BICEPS_BRACHII', name: 'Bíceps braquial', latinName: 'Biceps brachii', group: ARMS },
  { code: 'BRACHIALIS', name: 'Braquial anterior', latinName: 'Brachialis', group: ARMS },
  { code: 'BRACHIORADIALIS', name: 'Braquiorradial', latinName: 'Brachioradialis', group: ARMS },
  { code: 'TRICEPS_BRACHII', name: 'Tríceps braquial', latinName: 'Triceps brachii', group: ARMS },
  { code: 'FOREARM_FLEXORS', name: 'Flexores del antebrazo', latinName: 'Flexores antebrachii', group: ARMS },
  { code: 'FOREARM_EXTENSORS', name: 'Extensores del antebrazo', latinName: 'Extensores antebrachii', group: ARMS },
  { code: 'RECTUS_ABDOMINIS', name: 'Recto abdominal', latinName: 'Rectus abdominis', group: CORE },
  { code: 'OBLIQUES', name: 'Oblicuos', latinName: 'Obliquus externus et internus', group: CORE },
  { code: 'TRANSVERSE_ABDOMINIS', name: 'Transverso abdominal', latinName: 'Transversus abdominis', group: CORE },
  { code: 'HIP_FLEXORS', name: 'Flexores de cadera', latinName: 'Iliopsoas', group: CORE },
  { code: 'QUADRICEPS', name: 'Cuádriceps', latinName: 'Quadriceps femoris', group: LEGS },
  { code: 'HAMSTRINGS', name: 'Isquiotibiales', latinName: 'Musculi ischiocrurales', group: LEGS },
  { code: 'ADDUCTORS', name: 'Aductores', latinName: 'Musculi adductores', group: LEGS },
  { code: 'ABDUCTORS', name: 'Abductores de cadera', latinName: 'Gluteus medius et minimus', group: LEGS },
  { code: 'TIBIALIS_ANTERIOR', name: 'Tibial anterior', latinName: 'Tibialis anterior', group: LEGS },
  { code: 'GLUTEUS_MAXIMUS', name: 'Glúteo mayor', latinName: 'Gluteus maximus', group: GLUTES },
  { code: 'GLUTEUS_MEDIUS', name: 'Glúteo medio', latinName: 'Gluteus medius', group: GLUTES },
  { code: 'GASTROCNEMIUS', name: 'Gastrocnemio', latinName: 'Gastrocnemius', group: CALVES },
  { code: 'SOLEUS', name: 'Sóleo', latinName: 'Soleus', group: CALVES },
  { code: 'STERNOCLEIDOMASTOID', name: 'Esternocleidomastoideo', latinName: 'Sternocleidomastoideus', group: NECK },
];

const BY_CODE: ReadonlyMap<string, MuscleInfo> = new Map(MUSCLES.map((muscle) => [muscle.code, muscle]));

/** El músculo de un código, o `undefined` si no está en la taxonomía de la figura. */
export function muscleInfo(code: string): MuscleInfo | undefined {
  return BY_CODE.get(code.toUpperCase());
}

/** Los tres fascículos del deltoides: el código `DELTOID` no tiene zona propia. */
export const AGGREGATES: Readonly<Record<string, readonly string[]>> = {
  DELTOID: ['DELTOID_ANTERIOR', 'DELTOID_LATERAL', 'DELTOID_POSTERIOR'],
};

/** Músculos agrupados por grupo, en el orden del cuerpo, para la lista accesible. */
export function musclesByGroup(): readonly { group: MuscleGroupInfo; muscles: readonly MuscleInfo[] }[] {
  return GROUP_ORDER.map((group) => ({
    group,
    muscles: MUSCLES.filter((muscle) => muscle.group.code === group.code),
  })).filter((entry) => entry.muscles.length > 0);
}
