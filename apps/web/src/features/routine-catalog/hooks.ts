'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  catalogSearch,
  clearFilters,
  parseCatalogState,
  type CatalogState,
} from './catalog-state';
import { replaceSearch } from '@/shared/lib/url-state';

/**
 * El estado del catálogo, leído y escrito en la URL. El texto del buscador se
 * guarda aparte y se vuelca a la URL con una pausa, para no pedir al servidor
 * en cada tecla.
 */
export function useCatalogState() {
  const params = useSearchParams();
  const state = useMemo(() => parseCatalogState(params), [params]);
  // Lo escrito en el buscador todavía no es URL: se guarda con la `q` que había al
  // teclearlo. Cuando la URL cambia (el volcado con pausa, Atrás, un enlace), el
  // borrador deja de aplicar y el campo vuelve a seguir a la URL.
  const [draft, setDraft] = useState<{ value: string; base: string } | null>(null);
  const searchText = draft && draft.base === state.q ? draft.value : state.q;
  const typed = useRef(searchText);
  const setSearchText = useCallback(
    (value: string) => {
      typed.current = value;
      setDraft({ value, base: state.q });
    },
    [state.q],
  );

  const push = useCallback((next: CatalogState) => replaceSearch(catalogSearch(next)), []);

  // Dos cambios seguidos (un filtro y otro) llegan antes de que la URL se actualice:
  // se parte del último estado pedido, no del que ya pintó la URL, para no pisar el primero.
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
    typed.current = state.q;
  }, [state]);

  const update = useCallback(
    (patch: Partial<CatalogState>) => {
      const next = { ...latest.current, q: typed.current, ...patch };
      latest.current = next;
      push(next);
    },
    [push],
  );

  useEffect(() => {
    if (searchText.trim() === state.q.trim()) return;
    const timer = window.setTimeout(() => {
      const next = { ...latest.current, q: searchText };
      latest.current = next;
      push(next);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [push, searchText, state.q]);

  return {
    state,
    searchText,
    setSearchText,
    update,
    clear: () => {
      typed.current = '';
      setDraft(null);
      const next = clearFilters({ ...latest.current, q: '' });
      latest.current = next;
      push(next);
    },
  };
}
