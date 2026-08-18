/**
 * Adaptador de la cámara del computador.
 *
 * Aísla `navigator.mediaDevices` detrás de un puerto pequeño y sin React, para
 * que la consola de administración no dependa de la forma exacta de la API del
 * navegador y para que los errores lleguen ya traducidos a algo accionable por
 * quien atiende el mostrador ("el navegador bloqueó la cámara" es útil;
 * `NotAllowedError` no lo es).
 *
 * El adaptador nunca envía nada a la red: entrega fotogramas al llamador y ahí
 * termina su responsabilidad.
 */

export type CameraDevice = {
  readonly deviceId: string;
  readonly label: string;
};

export type CameraFailureReason =
  | 'unsupported'
  | 'denied'
  | 'not-found'
  | 'in-use'
  | 'insecure-context'
  | 'unknown';

export class CameraError extends Error {
  readonly reason: CameraFailureReason;

  constructor(reason: CameraFailureReason, message: string) {
    super(message);
    this.name = 'CameraError';
    this.reason = reason;
  }
}

const messagesByReason: Record<CameraFailureReason, string> = {
  unsupported: 'Este navegador no expone acceso a la cámara.',
  denied: 'El navegador bloqueó la cámara. Autorízala en el candado de la barra de direcciones.',
  'not-found': 'No se detectó ninguna cámara conectada al equipo.',
  'in-use': 'Otra aplicación está usando la cámara. Ciérrala e inténtalo de nuevo.',
  'insecure-context':
    'La cámara solo está disponible sobre HTTPS o en localhost. Abre la consola desde un origen seguro.',
  unknown: 'No se pudo iniciar la cámara.',
};

/** Traduce el error nativo a una causa accionable, sin inventar diagnósticos. */
function toCameraError(error: unknown): CameraError {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return new CameraError('denied', messagesByReason.denied);
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return new CameraError('not-found', messagesByReason['not-found']);
  }
  if (name === 'NotReadableError' || name === 'AbortError') {
    return new CameraError('in-use', messagesByReason['in-use']);
  }
  return new CameraError('unknown', messagesByReason.unknown);
}

/**
 * `mediaDevices` solo existe en contextos seguros. Se distingue del navegador
 * sin soporte porque la solución es distinta: servir por HTTPS, no cambiar de
 * navegador.
 */
export function cameraAvailability():
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: CameraFailureReason; readonly message: string } {
  if (typeof window === 'undefined') {
    return { ok: false, reason: 'unsupported', message: messagesByReason.unsupported };
  }
  if (!window.isSecureContext) {
    return {
      ok: false,
      reason: 'insecure-context',
      message: messagesByReason['insecure-context'],
    };
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: false, reason: 'unsupported', message: messagesByReason.unsupported };
  }
  return { ok: true };
}

export type CameraStartOptions = {
  readonly deviceId?: string | undefined;
  readonly width?: number;
  readonly height?: number;
};

/** Abre el flujo de vídeo. El llamador es responsable de detenerlo. */
export async function startCamera(options: CameraStartOptions = {}): Promise<MediaStream> {
  const availability = cameraAvailability();
  if (!availability.ok) throw new CameraError(availability.reason, availability.message);
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        // `ideal` en lugar de `exact`: una webcam que no alcance la resolución
        // pedida debe degradarse, no fallar.
        width: { ideal: options.width ?? 1280 },
        height: { ideal: options.height ?? 720 },
        facingMode: 'user',
        ...(options.deviceId ? { deviceId: { exact: options.deviceId } } : {}),
      },
    });
  } catch (error: unknown) {
    throw toCameraError(error);
  }
}

export function stopCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

/**
 * Cámaras disponibles. Antes de conceder permiso el navegador devuelve
 * etiquetas vacías; en ese caso se numeran para que el selector siga siendo
 * utilizable.
 */
export async function listCameras(): Promise<CameraDevice[]> {
  const availability = cameraAvailability();
  if (!availability.ok) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((device) => device.kind === 'videoinput')
    .map((device, position) => ({
      deviceId: device.deviceId,
      label: device.label || `Cámara ${position + 1}`,
    }));
}

export type CapturedFrame = {
  readonly blob: Blob;
  readonly dataUrl: string;
  readonly width: number;
  readonly height: number;
  /** SHA-256 del contenido; identifica la toma sin volver a transmitirla. */
  readonly checksum: string;
};

/** Dibuja el fotograma actual del vídeo en un lienzo del mismo tamaño real. */
export function drawFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new CameraError('unknown', 'El navegador no pudo abrir un lienzo 2D.');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Congela el fotograma actual como JPEG. Devuelve además su checksum, que es
 * lo que permite acreditar una captura sin conservar la imagen.
 */
export async function captureFrame(
  video: HTMLVideoElement,
  quality = 0.92,
): Promise<CapturedFrame> {
  if (!video.videoWidth || !video.videoHeight) {
    throw new CameraError('unknown', 'La cámara todavía no entrega imagen.');
  }
  const canvas = drawFrame(video);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality);
  });
  if (!blob) throw new CameraError('unknown', 'No se pudo codificar la captura.');
  const buffer = await blob.arrayBuffer();
  return {
    blob,
    dataUrl: canvas.toDataURL('image/jpeg', quality),
    width: canvas.width,
    height: canvas.height,
    checksum: await sha256Hex(buffer),
  };
}
