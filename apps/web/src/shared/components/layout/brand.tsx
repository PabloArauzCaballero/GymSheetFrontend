import { Dumbbell } from 'lucide-react';
import Link from 'next/link';

export function Brand() {
  return (
    <Link
      aria-label="Ir al panel"
      className="group inline-flex items-center gap-3"
      href="/dashboard"
    >
      <span className="relative grid size-9 place-items-center overflow-hidden rounded-[6px] bg-[var(--volt)] text-black shadow-[0_8px_24px_-8px_rgb(195_244_0/0.7)] transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
        <Dumbbell className="size-5 transition-transform duration-500 group-hover:-rotate-12" />
        <span
          aria-hidden
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        />
      </span>
      <span className="text-base font-extrabold tracking-[-0.05em] transition-colors group-hover:text-[var(--volt)]">
        GYMSHEET
      </span>
    </Link>
  );
}
