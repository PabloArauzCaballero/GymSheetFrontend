'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CameraError,
  cameraAvailability,
  captureFrame,
  drawFrame,
  listCameras,
  startCamera,
  stopCamera,
  type CameraDevice,
  type CapturedFrame,
} from './camera-adapter';
import {
  detectFaces,
  faceDetectionStrategy,
  isEnrollableFrame,
  type FaceDetection,
} from './face-detector';

/** Cadencia del análisis: suficiente para guiar el encuadre sin saturar la CPU. */
const DETECTION_INTERVAL_MS = 400;

export type UseCameraOptions = {
  /** Analiza cada fotograma buscando un rostro. Desactivado no consume CPU. */
  readonly detectFace?: boolean;
};

/** Enlace del elemento de vídeo: *callback ref*, nunca un objeto ref. */
export type AttachVideo = (element: HTMLVideoElement | null) => void;

export type CameraState = {
  readonly devices: readonly CameraDevice[];
  readonly deviceId: string | null;
  readonly active: boolean;
  readonly starting: boolean;
  readonly error: string | null;
  readonly detection: FaceDetection | null;
  readonly detectionStrategy: ReturnType<typeof faceDetectionStrategy>;
  readonly ready: boolean;
  start: (deviceId?: string) => Promise<void>;
  stop: () => void;
  capture: () => Promise<CapturedFrame>;
  selectDevice: (deviceId: string) => Promise<void>;
};

/**
 * El enlace del vídeo viaja separado del estado, no como una propiedad más.
 *
 * Mezclarlos hace que el analizador de React considere que todo el objeto
 * transporta un ref y marque cada lectura durante el render. Separarlos también
 * describe mejor la realidad: uno es una instrucción imperativa de montaje y el
 * otro es estado que se pinta.
 */
export type UseCameraResult = readonly [AttachVideo, CameraState];

/**
 * Ciclo de vida de la cámara para componentes React: abre el flujo, lo enlaza
 * al `<video>`, ejecuta la detección periódica y garantiza que el dispositivo
 * quede liberado al desmontar (la luz de la webcam debe apagarse sola).
 */
export function useCamera(options: UseCameraOptions = {}): UseCameraResult {
  const detectionEnabled = options.detectFace ?? false;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Al montarse el elemento se le enlaza el flujo ya abierto; sin esto, iniciar
  // la cámara antes de que exista el `<video>` dejaría la vista previa en negro.
  const attachVideo = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
    if (element && streamRef.current) {
      element.srcObject = streamRef.current;
      void element.play().catch(() => undefined);
    }
  }, []);
  const [devices, setDevices] = useState<readonly CameraDevice[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detection, setDetection] = useState<FaceDetection | null>(null);

  const stop = useCallback(() => {
    stopCamera(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
    setDetection(null);
  }, []);

  const start = useCallback(
    async (requestedDeviceId?: string) => {
      const availability = cameraAvailability();
      if (!availability.ok) {
        setError(availability.message);
        return;
      }
      setStarting(true);
      setError(null);
      try {
        stopCamera(streamRef.current);
        const stream = await startCamera(
          requestedDeviceId ? { deviceId: requestedDeviceId } : {},
        );
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setActive(true);
        setDeviceId(
          requestedDeviceId ?? stream.getVideoTracks()[0]?.getSettings().deviceId ?? null,
        );
        // Las etiquetas solo están disponibles después de conceder permiso.
        setDevices(await listCameras());
      } catch (cause: unknown) {
        setError(
          cause instanceof CameraError ? cause.message : 'No se pudo iniciar la cámara.',
        );
        setActive(false);
      } finally {
        setStarting(false);
      }
    },
    [],
  );

  const selectDevice = useCallback(
    async (nextDeviceId: string) => {
      setDeviceId(nextDeviceId);
      if (active || starting) await start(nextDeviceId);
    },
    [active, starting, start],
  );

  const capture = useCallback(async () => {
    const video = videoRef.current;
    if (!video) throw new CameraError('unknown', 'La vista previa no está montada.');
    return captureFrame(video);
  }, []);

  // Libera el dispositivo al desmontar aunque el consumidor olvide llamar a `stop`.
  useEffect(() => () => stopCamera(streamRef.current), []);

  useEffect(() => {
    if (!active || !detectionEnabled) return undefined;
    let cancelled = false;
    let timer: number | undefined;

    const tick = async () => {
      const video = videoRef.current;
      if (video?.videoWidth) {
        try {
          const result = await detectFaces(drawFrame(video));
          if (!cancelled) setDetection(result);
        } catch {
          if (!cancelled) setDetection(null);
        }
      }
      // Se reprograma al terminar, no en paralelo: un análisis lento nunca se
      // solapa consigo mismo.
      if (!cancelled) timer = window.setTimeout(tick, DETECTION_INTERVAL_MS);
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [active, detectionEnabled]);

  const state: CameraState = {
    devices,
    deviceId,
    active,
    starting,
    error,
    detection,
    detectionStrategy: faceDetectionStrategy(),
    ready: active && (!detectionEnabled || (detection ? isEnrollableFrame(detection) : false)),
    start,
    stop,
    capture,
    selectDevice,
  };

  return [attachVideo, state];
}
