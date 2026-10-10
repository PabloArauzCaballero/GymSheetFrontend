/**
 * Forma mínima de un error de la API. Es estructural a propósito: este paquete
 * no depende de `@gymsheet/api-client`, y `ApiError` la cumple tal cual.
 */
export type ApiErrorLike = {
  message: string;
  status?: number;
  code?: string;
  details?: Record<string, unknown>;
  kind?: string;
};

export type SaveErrorView = {
  titulo: string;
  mensaje: string;
  /** Paso al que conviene devolver a la persona (base 0), si el error apunta a uno. */
  paso?: number;
  /** `true` si reintentar tal cual puede funcionar (red, límite de peticiones). */
  reintentable: boolean;
};

const STEP_DAYS = 4;
const STEP_REVIEW = 5;

/**
 * Traduce un fallo al guardar a un mensaje humano. Se compara siempre el `code`
 * estable del backend, nunca el texto del mensaje (02 · códigos estables).
 */
export function describeSaveError(error: ApiErrorLike): SaveErrorView {
  switch (error.code) {
    case 'ROUTINE_HAS_NO_DAYS':
      return {
        titulo: 'Falta un ejercicio',
        mensaje: 'Cada día necesita al menos un ejercicio. Añade uno o quita el día.',
        paso: STEP_DAYS,
        reintentable: false,
      };
    case 'ROUTINE_DUPLICATE':
      return {
        titulo: 'Ya existe una rutina idéntica',
        mensaje: 'Cambia algún día, ejercicio o repetición para guardarla.',
        paso: STEP_REVIEW,
        reintentable: false,
      };
    default:
      break;
  }
  if (error.kind === 'network' || error.status === 0 || error.status === 408) {
    return {
      titulo: 'Sin conexión',
      mensaje: 'No pudimos guardar. Tu borrador sigue en este dispositivo; vuelve a intentarlo.',
      reintentable: true,
    };
  }
  if (error.status === 429 || error.kind === 'rate-limit') {
    return {
      titulo: 'Demasiados intentos',
      mensaje: 'Espera un momento y vuelve a guardar.',
      reintentable: true,
    };
  }
  if (error.status === 401 || error.kind === 'unauthorized') {
    return {
      titulo: 'Sesión caducada',
      mensaje: 'Inicia sesión de nuevo; tu borrador sigue guardado.',
      reintentable: false,
    };
  }
  if (error.status === 403 || error.kind === 'forbidden') {
    return {
      titulo: 'Sin permiso',
      mensaje: 'No puedes modificar esta rutina.',
      reintentable: false,
    };
  }
  if (error.status === 400 || error.status === 422 || error.kind === 'validation') {
    return {
      titulo: 'Revisa los datos',
      mensaje: error.message,
      reintentable: false,
    };
  }
  return {
    titulo: 'No se pudo guardar',
    mensaje: 'Ocurrió un error inesperado. Tu borrador sigue en este dispositivo.',
    reintentable: true,
  };
}
