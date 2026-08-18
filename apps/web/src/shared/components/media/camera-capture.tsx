'use client';

import { Camera, CameraOff, RefreshCw, ScanFace, Video } from 'lucide-react';
import { useState } from 'react';
import type { CapturedFrame } from '@/shared/lib/camera/camera-adapter';
import type { FaceDetection } from '@/shared/lib/camera/face-detector';
import { useCamera } from '@/shared/lib/camera/use-camera';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';

/**
 * Vista previa de la cámara del computador con captura y, opcionalmente, guía
 * de encuadre facial. Es puramente local: entrega el fotograma al llamador y no
 * habla con la red.
 */
export function CameraCapture({
  detectFace = false,
  onCapture,
  captureLabel = 'Capturar',
}: Readonly<{
  detectFace?: boolean;
  /** Recibe el fotograma y el último análisis de rostro, si la detección está activa. */
  onCapture: (frame: CapturedFrame, detection: FaceDetection | null) => void;
  captureLabel?: string;
}>) {
  const [attachVideo, camera] = useCamera({ detectFace });
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const faces = camera.detection?.faces.length ?? 0;
  const guidance = !camera.active
    ? null
    : !camera.detection
      ? 'Analizando el encuadre…'
      : faces === 0
        ? 'No se detecta un rostro. Acércate y busca luz frontal.'
        : faces > 1
          ? 'Hay más de una persona en el encuadre. Debe quedar solo quien se registra.'
          : 'Rostro encuadrado.';

  return (
    <div className="grid gap-4">
      <div className="relative aspect-video overflow-hidden rounded-[4px] border border-[var(--border-subtle)] bg-[var(--surface-low)]">
        <video
          className="size-full object-cover"
          muted
          playsInline
          ref={attachVideo}
          // Espejo: el operador se ve como en un espejo, que es lo que espera.
          style={{ transform: 'scaleX(-1)' }}
        />
        {!camera.active ? (
          <div className="absolute inset-0 grid place-items-center gap-2 text-center text-sm text-[var(--text-muted)]">
            <CameraOff aria-hidden className="mx-auto size-8" />
            <p>La cámara está apagada.</p>
          </div>
        ) : null}
        {detectFace && camera.active ? (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-[var(--surface)]/85 px-3 py-2 text-xs backdrop-blur">
            <span className="flex items-center gap-2">
              <ScanFace aria-hidden className="size-4" />
              {guidance}
            </span>
            <Badge tone={camera.ready ? 'success' : 'warning'}>
              {camera.detectionStrategy === 'native' ? 'Detector del navegador' : 'Detección asistida'}
            </Badge>
          </div>
        ) : null}
      </div>

      {camera.error ? (
        <p className="text-sm text-[var(--danger-text)]" role="alert">
          {camera.error}
        </p>
      ) : null}
      {captureError ? (
        <p className="text-sm text-[var(--danger-text)]" role="alert">
          {captureError}
        </p>
      ) : null}
      {detectFace && camera.active && camera.detectionStrategy === 'heuristic' ? (
        <p className="text-xs text-[var(--text-muted)]">
          Este navegador no expone detector de rostros; se usa una guía por color de piel que
          orienta el encuadre pero no confirma que haya una persona. Revisa la vista previa antes
          de registrar.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {camera.active ? (
          <>
            <Button
              loading={capturing}
              onClick={async () => {
                setCapturing(true);
                setCaptureError(null);
                try {
                  onCapture(await camera.capture(), camera.detection);
                } catch (error: unknown) {
                  setCaptureError(
                    error instanceof Error ? error.message : 'No se pudo capturar la imagen.',
                  );
                } finally {
                  setCapturing(false);
                }
              }}
              type="button"
              variant="primary"
            >
              <Camera className="size-4" />
              {captureLabel}
            </Button>
            <Button onClick={camera.stop} type="button" variant="ghost">
              <CameraOff className="size-4" />
              Apagar
            </Button>
          </>
        ) : (
          <Button
            loading={camera.starting}
            onClick={() => camera.start(camera.deviceId ?? undefined)}
            type="button"
            variant="primary"
          >
            <Video className="size-4" />
            Encender cámara
          </Button>
        )}
        {camera.devices.length > 1 ? (
          <Select
            aria-label="Cámara"
            className="min-w-56"
            onChange={(event) => void camera.selectDevice(event.target.value)}
            value={camera.deviceId ?? ''}
          >
            {camera.devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </Select>
        ) : null}
        {camera.active ? (
          <Button
            aria-label="Reiniciar cámara"
            onClick={() => camera.start(camera.deviceId ?? undefined)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <RefreshCw className="size-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
