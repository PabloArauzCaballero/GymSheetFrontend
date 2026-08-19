'use client';

import Link from 'next/link';
import { brandIconByKey } from '@/shared/theme/brand-icons';
import { useBrand } from '@/shared/theme/brand-provider';

export function Brand() {
  const brand = useBrand();
  const Icon = brandIconByKey[brand.icon];
  return (
    <Link
      aria-label="Ir al panel"
      className="group inline-flex items-center gap-3"
      href="/dashboard"
    >
      <span className="relative grid size-9 place-items-center overflow-hidden rounded-[6px] bg-[var(--volt)] text-[var(--accent-contrast)] shadow-[0_8px_24px_-8px_rgb(var(--accent-channels)/0.7)] transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
        <Icon className="size-5 transition-transform duration-500 group-hover:-rotate-12" />
        <span
          aria-hidden
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[rgb(var(--sheen-channels)/0.4)] to-transparent transition-transform duration-700 group-hover:translate-x-full"
        />
      </span>
      <span className="text-base font-semibold tracking-[-0.022em] transition-colors group-hover:text-[var(--accent-ink)]">
        {brand.wordmark}
      </span>
    </Link>
  );
}
