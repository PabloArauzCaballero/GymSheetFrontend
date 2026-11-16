'use client';

import { LoaderCircle, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { logout as logoutRequest } from '@/features/auth/services/auth-client';
import { Button } from '@/shared/components/ui/button';
import { confirm } from '@/shared/notifications';

/**
 * Cierra la sesión, tras confirmarlo (igual que la app). En la barra va como
 * icono; en el perfil y en Ajustes, como fila destructiva de una lista (`row`):
 * tinta de peligro sin relleno, para que se encuentre sin ser lo más llamativo.
 */
export function LogoutButton({
  row = false,
}: Readonly<{
  /** Fila destructiva dentro de una lista agrupada. */
  row?: boolean;
}>) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function logout() {
    const result = await confirm({
      title: 'Cerrar sesión',
      message: 'Se cerrará la sesión en este dispositivo. Deberás iniciar sesión de nuevo.',
      confirmLabel: 'Cerrar sesión',
      cancelLabel: 'Volver',
      severity: 'danger',
    });
    if (!result.confirmed) return;
    setLoading(true);
    try {
      await logoutRequest();
      router.replace('/login');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }
  if (row) {
    return (
      <button
        aria-busy={loading || undefined}
        className="tap flex min-h-12 w-full items-center gap-3 py-2 text-left text-[var(--danger)] transition-opacity duration-[var(--dur-2)] hover:opacity-90 disabled:opacity-60"
        data-testid="logout-row"
        disabled={loading}
        onClick={logout}
        type="button"
      >
        <span aria-hidden className="grid w-9 shrink-0 place-items-center">
          {loading ? <LoaderCircle className="size-5 animate-spin" /> : <LogOut className="size-5" />}
        </span>
        <span className="t-headline">Cerrar sesión</span>
      </button>
    );
  }
  return (
    <Button aria-label="Cerrar sesión" loading={loading} onClick={logout} size="icon" variant="ghost">
      <LogOut aria-hidden className="size-4" />
    </Button>
  );
}
