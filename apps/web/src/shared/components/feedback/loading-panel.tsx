export function LoadingPanel({ rows = 4 }: Readonly<{ rows?: number }>) {
  return (
    <div aria-label="Cargando" className="panel p-5" role="status">
      <div className="shimmer relative h-4 w-28 overflow-hidden rounded bg-[var(--surface-high)]" />
      <div className="mt-6 grid gap-3">
        {Array.from({ length: rows }, (_, index) => (
          <div
            className="shimmer relative h-14 overflow-hidden rounded-[6px] bg-[var(--surface-low)]"
            key={index}
            style={{ opacity: 1 - index * 0.08 }}
          />
        ))}
      </div>
    </div>
  );
}
