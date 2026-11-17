'use client';

import { ImagePlus, X } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';

const ACCEPT = 'image/jpeg,image/png';

/** Photos chosen before the listing exists (step 2): previews from object URLs, released on change. */
export function PhotoPicker({
  files,
  onChange,
  max = 10,
}: Readonly<{ files: File[]; onChange: (files: File[]) => void; max?: number }>) {
  const input = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);
  const full = files.length >= max;
  return (
    <div className="grid gap-3">
      <ul aria-label="Fotos elegidas" className="m-0 grid list-none grid-cols-3 gap-3 p-0 sm:grid-cols-4">
        {previews.map((url, index) => (
          <li className="relative aspect-square overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-high)]" key={url}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
            <img alt={`Foto ${index + 1}`} className="size-full object-cover" src={url} />
            <button
              aria-label={`Quitar la foto ${index + 1}`}
              className="absolute right-1.5 top-1.5 grid size-9 place-items-center rounded-full bg-[color-mix(in_srgb,var(--background)_78%,transparent)] text-[var(--text)] backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-[var(--volt)]"
              onClick={() => onChange(files.filter((_, position) => position !== index))}
              type="button"
            >
              <X aria-hidden className="size-4" />
            </button>
          </li>
        ))}
        {full ? null : (
          <li>
            <button
              className="grid aspect-square w-full place-items-center content-center gap-1 rounded-[var(--radius-lg)] border border-dashed border-[var(--border-control,var(--border))] text-[15px] text-[var(--text-muted)] transition-colors duration-[var(--dur-1)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]"
              onClick={() => input.current?.click()}
              type="button"
            >
              <ImagePlus aria-hidden className="size-6" />
              Añadir foto
            </button>
          </li>
        )}
      </ul>
      <input
        accept={ACCEPT}
        aria-label="Elegir fotos"
        className="sr-only"
        multiple
        onChange={(event) => {
          const chosen = Array.from(event.target.files ?? []).filter((file) => ACCEPT.split(',').includes(file.type));
          onChange([...files, ...chosen].slice(0, max));
          event.target.value = '';
        }}
        ref={input}
        tabIndex={-1}
        type="file"
      />
      <p className="t-footnote text-[var(--text-muted)]">JPG o PNG, hasta {max}. La primera es la portada.</p>
    </div>
  );
}
