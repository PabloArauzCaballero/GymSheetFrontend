/**
 * Detección de rostro sobre un fotograma de la cámara.
 *
 * Dos estrategias tras un mismo puerto:
 *
 * - `native`: la Shape Detection API (`window.FaceDetector`), disponible hoy en
 *   navegadores basados en Chromium. Es un detector real del sistema.
 * - `heuristic`: respaldo propio por color de piel para navegadores sin esa API
 *   (Firefox, Safari). Encuentra una región compatible con un rostro, pero no
 *   distingue una cara de cualquier otra superficie de tono similar, así que se
 *   marca como tal y la interfaz exige confirmación humana antes de registrar.
 *
 * Ninguna de las dos identifica a nadie ni produce una plantilla biométrica:
 * solo responden "hay exactamente un rostro encuadrado" para guiar la captura.
 */

export type FaceBox = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type FaceDetectionStrategy = 'native' | 'heuristic';

export type FaceDetection = {
  readonly strategy: FaceDetectionStrategy;
  readonly faces: readonly FaceBox[];
  /** 0–1. En la heurística mide cobertura y proporción, no identidad. */
  readonly confidence: number;
};

type NativeFaceDetector = {
  detect(source: CanvasImageSource): Promise<{ boundingBox: DOMRectReadOnly }[]>;
};

type FaceDetectorConstructor = new (options?: {
  maxDetectedFaces?: number;
  fastMode?: boolean;
}) => NativeFaceDetector;

function nativeConstructor(): FaceDetectorConstructor | null {
  if (typeof window === 'undefined') return null;
  const candidate = (window as unknown as { FaceDetector?: FaceDetectorConstructor }).FaceDetector;
  return typeof candidate === 'function' ? candidate : null;
}

export function faceDetectionStrategy(): FaceDetectionStrategy {
  return nativeConstructor() ? 'native' : 'heuristic';
}

/** Muestreo reducido: la detección no necesita resolución completa y así el bucle no bloquea la interfaz. */
const ANALYSIS_WIDTH = 160;
/** Proporción alto/ancho admisible para una región facial. */
const MIN_ASPECT = 0.8;
const MAX_ASPECT = 2.2;
/** Fracción del encuadre que debe ocupar la región para considerarla un rostro cercano. */
const MIN_COVERAGE = 0.02;
const MAX_COVERAGE = 0.75;

/**
 * Criterio de tono de piel en YCbCr, robusto frente a cambios de iluminación
 * porque separa luminancia de crominancia. Umbrales clásicos de la literatura
 * de segmentación (Cb 77–127, Cr 133–173).
 */
function isSkinTone(red: number, green: number, blue: number): boolean {
  const chromaBlue = 128 - 0.168736 * red - 0.331264 * green + 0.5 * blue;
  const chromaRed = 128 + 0.5 * red - 0.418688 * green - 0.081312 * blue;
  const luma = 0.299 * red + 0.587 * green + 0.114 * blue;
  return luma > 40 && chromaBlue >= 77 && chromaBlue <= 127 && chromaRed >= 133 && chromaRed <= 173;
}

/** Mayor componente conexa de la máscara, por inundación iterativa (sin recursión). */
function largestComponent(
  mask: Uint8Array,
  width: number,
  height: number,
): { pixels: number; box: FaceBox } | null {
  const visited = new Uint8Array(mask.length);
  const stack: number[] = [];
  let best: { pixels: number; box: FaceBox } | null = null;

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;
    stack.push(start);
    visited[start] = 1;
    let pixels = 0;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    while (stack.length) {
      const index = stack.pop() as number;
      const x = index % width;
      const y = Math.floor(index / width);
      pixels += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;

      const neighbours = [
        x > 0 ? index - 1 : -1,
        x < width - 1 ? index + 1 : -1,
        y > 0 ? index - width : -1,
        y < height - 1 ? index + width : -1,
      ];
      for (const neighbour of neighbours) {
        if (neighbour >= 0 && mask[neighbour] && !visited[neighbour]) {
          visited[neighbour] = 1;
          stack.push(neighbour);
        }
      }
    }

    if (!best || pixels > best.pixels) {
      best = {
        pixels,
        box: { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
      };
    }
  }
  return best;
}

function detectHeuristic(canvas: HTMLCanvasElement): FaceDetection {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return { strategy: 'heuristic', faces: [], confidence: 0 };

  const scale = ANALYSIS_WIDTH / canvas.width;
  const width = ANALYSIS_WIDTH;
  const height = Math.max(1, Math.round(canvas.height * scale));
  const sample = document.createElement('canvas');
  sample.width = width;
  sample.height = height;
  const sampleContext = sample.getContext('2d', { willReadFrequently: true });
  if (!sampleContext) return { strategy: 'heuristic', faces: [], confidence: 0 };
  sampleContext.drawImage(canvas, 0, 0, width, height);

  const { data } = sampleContext.getImageData(0, 0, width, height);
  const mask = new Uint8Array(width * height);
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    const offset = pixel * 4;
    mask[pixel] = isSkinTone(data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0)
      ? 1
      : 0;
  }

  const component = largestComponent(mask, width, height);
  if (!component) return { strategy: 'heuristic', faces: [], confidence: 0 };

  const coverage = component.pixels / mask.length;
  const aspect = component.box.height / Math.max(1, component.box.width);
  if (coverage < MIN_COVERAGE || coverage > MAX_COVERAGE) {
    return { strategy: 'heuristic', faces: [], confidence: 0 };
  }
  if (aspect < MIN_ASPECT || aspect > MAX_ASPECT) {
    return { strategy: 'heuristic', faces: [], confidence: 0 };
  }

  // La confianza premia la región centrada y de tamaño típico de un retrato;
  // se declara acotada a 0.75 porque la heurística no puede afirmar identidad.
  const centreX = (component.box.x + component.box.width / 2) / width;
  const centring = 1 - Math.min(1, Math.abs(centreX - 0.5) * 2);
  const sizeScore = Math.min(1, coverage / 0.25);
  const confidence = Math.min(0.75, 0.35 + 0.25 * centring + 0.15 * sizeScore);

  return {
    strategy: 'heuristic',
    confidence,
    faces: [
      {
        x: component.box.x / scale,
        y: component.box.y / scale,
        width: component.box.width / scale,
        height: component.box.height / scale,
      },
    ],
  };
}

let cachedNativeDetector: NativeFaceDetector | null = null;

/**
 * Detecta rostros sobre un lienzo ya dibujado. Si el detector nativo falla en
 * tiempo de ejecución se cae a la heurística en vez de propagar el error: la
 * captura debe seguir siendo posible aunque la detección no ayude.
 */
export async function detectFaces(canvas: HTMLCanvasElement): Promise<FaceDetection> {
  const Constructor = nativeConstructor();
  if (Constructor) {
    try {
      cachedNativeDetector ??= new Constructor({ maxDetectedFaces: 5, fastMode: true });
      const detections = await cachedNativeDetector.detect(canvas);
      return {
        strategy: 'native',
        confidence: detections.length === 1 ? 1 : 0,
        faces: detections.map((detection) => ({
          x: detection.boundingBox.x,
          y: detection.boundingBox.y,
          width: detection.boundingBox.width,
          height: detection.boundingBox.height,
        })),
      };
    } catch {
      cachedNativeDetector = null;
    }
  }
  return detectHeuristic(canvas);
}

/** Un encuadre válido para registrar es el que contiene exactamente un rostro. */
export function isEnrollableFrame(detection: FaceDetection): boolean {
  return detection.faces.length === 1 && detection.confidence > 0;
}
