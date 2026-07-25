import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: Readonly<{ page: number; totalPages: number; onPageChange: (page: number) => void }>) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-4 py-3">
      <span className="text-xs text-[var(--text-muted)]">
        Página {page} de {totalPages}
      </span>
      <div className="flex gap-2">
        <Button
          aria-label="Página anterior"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          size="icon"
          variant="ghost"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          aria-label="Página siguiente"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          size="icon"
          variant="ghost"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
