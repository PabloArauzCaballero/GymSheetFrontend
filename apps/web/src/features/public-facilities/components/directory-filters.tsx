'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { SERVICE_LABEL } from './service-labels';

/**
 * Actualiza la URL en vez de guardar estado propio: cada combinación de
 * filtros queda en un enlace navegable y compartible, coherente con que esta
 * es la única parte del producto pensada para indexarse.
 */
export function DirectoryFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');

  function pushParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router.push(`/gimnasios?${params.toString()}`);
  }

  const hasFilters = Boolean(searchParams.get('search') || searchParams.get('servicio'));

  return (
    <section className="panel reveal grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_240px_auto] sm:items-end">
      <Field htmlFor="directory-search" label="Buscar">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            pushParams({ search });
          }}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              className="pl-10"
              id="directory-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre del gimnasio"
              value={search}
            />
          </div>
        </form>
      </Field>
      <Field htmlFor="directory-servicio" label="Servicio">
        <Select
          id="directory-servicio"
          onChange={(event) => pushParams({ servicio: event.target.value })}
          value={searchParams.get('servicio') ?? ''}
        >
          <option value="">Todos</option>
          {Object.entries(SERVICE_LABEL).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      {hasFilters ? (
        <button
          className="tap inline-flex h-11 items-center gap-1.5 justify-self-start rounded-[6px] px-3 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] sm:justify-self-end"
          onClick={() => {
            setSearch('');
            router.push('/gimnasios');
          }}
          type="button"
        >
          <X className="size-4" />
          Limpiar
        </button>
      ) : null}
    </section>
  );
}
