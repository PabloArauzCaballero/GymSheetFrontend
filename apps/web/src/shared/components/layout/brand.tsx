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
      <span className="grid size-9 place-items-center rounded-[var(--radius-md)] bg-[var(--volt)] text-[var(--accent-contrast)]">
        <Icon className="size-5" />
      </span>
      <span className="text-base font-semibold tracking-[-0.022em]">{brand.wordmark}</span>
    </Link>
  );
}
