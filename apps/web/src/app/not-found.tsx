import { ButtonLink } from '@/shared/components/ui/button';

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <div className="max-w-lg text-center">
        <p className="data-label text-[var(--volt)]">Error 404</p>
        <h1 className="mt-4 text-5xl font-extrabold tracking-[-0.05em]">Ruta no encontrada.</h1>
        <p className="mt-5 leading-7 text-[var(--text-muted)]">
          La vista solicitada no existe o ya no está disponible.
        </p>
        <ButtonLink className="mt-8" href="/dashboard" variant="primary">
          Volver al panel
        </ButtonLink>
      </div>
    </main>
  );
}
