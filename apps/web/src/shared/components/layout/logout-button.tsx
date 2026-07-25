'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { logout as logoutRequest } from '@/features/auth/services/auth-client';
import { Button } from '@/shared/components/ui/button';

export function LogoutButton() {
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
      size="icon"
      variant="ghost"
    >
      <LogOut className="size-4" />
    </Button>
  );
}
