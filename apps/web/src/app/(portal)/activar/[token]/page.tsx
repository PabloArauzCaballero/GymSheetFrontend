import type { Metadata } from 'next';
import { ActivationConfirm } from '@/features/admin/components/activation-confirm';

export const metadata: Metadata = { title: 'Activar cuenta' };

/**
 * Destino del enlace que el cliente envía por WhatsApp tras pagar en efectivo.
 *
 * Vive dentro del grupo protegido a propósito: quien no tenga sesión será
 * enviado a iniciarla y devuelto aquí con `returnTo`, que es exactamente el
 * recorrido que debe hacer un administrador que abre el enlace desde su
 * teléfono.
 */
export default async function ActivarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ActivationConfirm token={token} />;
}
