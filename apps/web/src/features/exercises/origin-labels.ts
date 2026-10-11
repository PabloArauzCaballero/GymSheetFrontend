/** Etiquetas legibles del estado y el origen de un ejercicio (nunca el código interno). */
export function exerciseStatusLabel(estado: string): string {
  return estado === 'ACTIVO' ? 'Activo' : estado === 'INACTIVO' ? 'Inactivo' : 'Estado desconocido';
}

export function exerciseTypeLabel(tipo: string): string {
  return tipo === 'PERSONAL' ? 'Personal' : 'Del catálogo';
}

/** Texto discreto de «Origen»; `null` si no hay fuente que mostrar. */
export function exerciseOriginLabel(dataSource: string | null | undefined): string | null {
  switch (dataSource) {
    case 'EXERCISES_DATASET':
      return 'Base de datos pública de ejercicios';
    case 'CUSTOM':
      return 'Creado en GymSheet';
    default:
      return null;
  }
}
