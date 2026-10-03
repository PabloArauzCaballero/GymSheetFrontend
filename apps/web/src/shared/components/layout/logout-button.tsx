'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { logout as logoutRequest } from '@/features/auth/services/auth-client';
import { Button } from '@/shared/components/ui/button';

/**
 * Cierra la sesión. En la barra va como icono; en Ajustes, con su nombre
 * (`withLabel`), porque ahí es una acción de la página y no un atajo.
 */
export function LogoutButton({ withLabel = false }: Readonly<{ withLabel?: boolean }>) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function logout() {
    setLoading(true);
    try {
      await logoutRequest();
      router.replace('/login');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }
  return (
    <Button
      aria-label="Cerrar sesión"
      loading={loading}
      onClick={logout}
      size={withLabel ? 'md' : 'icon'}
      variant={withLabel ? 'danger' : 'ghost'}
    >
      {loading && withLabel ? null : <LogOut aria-hidden className="size-4" />}
      {withLabel ? 'Cerrar sesión' : null}
    </Button>
  );
}
