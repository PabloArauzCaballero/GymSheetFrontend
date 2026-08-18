'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { applyBrandCopy, defaultBrand, type TenantBrand } from './brand-contract';

/**
 * Marca del inquilino disponible en el árbol de cliente.
 *
 * El servidor la resuelve por host y la pasa una sola vez; los componentes la
 * leen de aquí en vez de importar constantes, que es lo que antes ataba la
 * interfaz a un único gimnasio.
 */
const BrandContext = createContext<TenantBrand>(defaultBrand);

export function BrandProvider({
  brand,
  children,
}: Readonly<{ brand: TenantBrand; children: ReactNode }>) {
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}

export function useBrand(): TenantBrand {
  return useContext(BrandContext);
}

/** Resuelve `{marca}` en textos de producto con el nombre del inquilino. */
export function useBrandCopy(): (text: string) => string {
  const brand = useBrand();
  return (text: string) => applyBrandCopy(text, brand);
}
