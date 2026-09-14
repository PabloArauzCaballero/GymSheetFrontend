'use client';

import { Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CameraCapture } from '@/shared/components/media/camera-capture';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { hasCameraDevice } from '@/shared/lib/camera/camera-adapter';

/**
 * De dónde sale la foto: del disco o de la cámara del equipo.
 *
 * El móvil ya preguntaba esto ("Hacer una foto" / "Elegir de la galería") y la
 * web sólo sabía abrir el selector de archivos, aunque `CameraCapture` llevaba
 * escrito desde el alta de personas en administración. Esta pieza es el punto
 * donde ambas vías se ofrecen juntas, para que Stories y la galería del perfil
 * no repitan cada una su propio conmutador.
 *
 * La degradación es la razón de que la elección viva aquí y no en cada pantalla:
 * en un escritorio sin webcam **no se ofrece** la pestaña de cámara. Un botón
 * que sólo puede terminar en «no se detectó ninguna cámara» es peor que no
 * estar, y la alternativa —el archivo— ya resuelve el caso. Si hay cámara pero
 * el navegador acaba negando el permiso, el aviso lo da `CameraCapture` en su
 * sitio, en línea y sin toast: es un estado del panel, no un error del producto.
 */

/** `probing` sólo dura lo que tarda `enumerateDevices`; no se pinta nada aún. */
type CameraAvailability = 'probing' | 'available' | 'unavailable';

export function MediaSourceDialog({
  accept = 'image/*',
  busy = false,
  captureFileName,
  captureLabel = 'Usar esta foto',
  description,
  fileLabel = 'Elegir un archivo',
  onOpenChange,
  onPick,
  open,
  title,
}: Readonly<{
  /** Tipos que acepta el selector de archivos. La captura siempre es JPEG. */
  accept?: string;
  /** Deshabilita ambas vías mientras la subida anterior sigue en curso. */
  busy?: boolean;
  /** Nombre (sin extensión) con el que viaja el fotograma capturado. */
  captureFileName: string;
  captureLabel?: string;
  description?: string;
  fileLabel?: string;
  onOpenChange: (open: boolean) => void;
  onPick: (file: File) => void;
  open: boolean;
  title: string;
}>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState<CameraAvailability>('probing');

  // Se comprueba al abrir y no una sola vez al montar: entre una apertura y la
  // siguiente se puede haber enchufado una webcam, o concedido el permiso que
  // hace visible el inventario. La respuesta anterior se mantiene mientras se
  // repite la comprobación —en vez de volver a `probing`— para que reabrir el
  // diálogo no haga parpadear la pestaña de cámara.
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    void hasCameraDevice().then((present) => {
      if (!cancelled) setCamera(present ? 'available' : 'unavailable');
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const pick = (file: File) => {
    onPick(file);
    onOpenChange(false);
  };

  const fileField = (
    <>
      <input
        accept={accept}
        // Fuera del recorrido de teclado: se llega por el botón de al lado, que
        // sí se anuncia. Un campo de archivo invisible en medio sólo confunde.
        aria-hidden
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Se limpia siempre: si no, elegir el mismo archivo dos veces
          // seguidas no dispara `change` y la subida parece ignorada.
          event.target.value = '';
          if (file) pick(file);
        }}
        ref={fileInputRef}
        tabIndex={-1}
        type="file"
      />
      <Button
        className="justify-self-start"
        disabled={busy}
        onClick={() => fileInputRef.current?.click()}
        type="button"
        variant={camera === 'available' ? 'secondary' : 'primary'}
      >
        <Upload aria-hidden className="size-4" />
        {fileLabel}
      </Button>
    </>
  );

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-2xl" description={description} title={title}>
        {camera === 'available' ? (
          <Tabs defaultValue="file">
            <TabsList>
              <TabsTrigger value="file">Archivo</TabsTrigger>
              <TabsTrigger value="camera">Cámara</TabsTrigger>
            </TabsList>
            <TabsContent value="file">
              <div className="grid gap-4">{fileField}</div>
            </TabsContent>
            {/* Radix desmonta la pestaña inactiva, así que volver a «Archivo»
                libera la webcam y su piloto se apaga solo. */}
            <TabsContent value="camera">
              <CameraCapture
                captureLabel={captureLabel}
                onCapture={(frame) =>
                  pick(
                    new File([frame.blob], `${captureFileName}.jpg`, {
                      type: 'image/jpeg',
                      lastModified: Date.now(),
                    }),
                  )
                }
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="grid gap-4">{fileField}</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
