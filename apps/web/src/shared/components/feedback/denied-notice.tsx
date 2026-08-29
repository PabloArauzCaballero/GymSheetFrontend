'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { notify } from '@/shared/notifications';

/**
 * Explica por qué el usuario ha acabado aquí y no donde pulsó.
 *
 * `requireRole` y la pantalla de permisos redirigen con `?denied=1`, pero
 * **nadie leía ese parámetro**: el usuario pulsaba una entrada del menú y
 * aparecía en otra pantalla sin una palabra, que es indistinguible de un enlace
 * roto. Vive en el armazón del portal para cubrir todos los destinos de esas
 * redirecciones sin repetirse en cada página. Ver M-2.
 */
export function DeniedNotice() {
  const searchParams = useSearchParams();
  const denied = searchParams.get('denied');
  // Un aviso por redirección: en desarrollo React monta dos veces, y el usuario
  // no debe ver el mismo mensaje repetido.
  const announced = useRef<string | null>(null);

  useEffect(() => {
    if (!denied || announced.current === denied) return;
    announced.current = denied;
    notify.error(new Error('No tienes permiso para acceder a esa sección.'));
  }, [denied]);

  return null;
}
