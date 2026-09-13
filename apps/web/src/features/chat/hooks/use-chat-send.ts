'use client';

import { useState } from 'react';
import { chatService } from '@/features/chat/services/chat-service';
import type { Message } from '@/shared/api/schemas';
import { notify } from '@/shared/notifications';

type SendAck = { ok: boolean; error?: string };

/**
 * Los cuatro caminos por los que sale un mensaje: texto, foto, vídeo y
 * ubicación.
 *
 * Van juntos y aparte del resto del hilo porque comparten la misma forma —una
 * bandera de «enviando», una llamada y el mensaje resultante entrando en la
 * vista— y porque son lo único de la conversación que escribe en el servidor
 * sin pasar por la caché de consultas.
 *
 * `showOwnMessage` lo pone quien usa el hook: el envío propio entra en la vista
 * sin esperar a que el socket lo reemita, y si además llega por el socket se
 * descarta por id.
 */
export function useChatSend({
  conversationId,
  sendOverSocket,
  showOwnMessage,
}: {
  conversationId: string;
  sendOverSocket: (conversationId: string, body: string) => Promise<SendAck>;
  showOwnMessage: (message: Message) => void;
}) {
  const [sending, setSending] = useState(false);
  const [sendingMedia, setSendingMedia] = useState(false);

  async function sendText(body: string) {
    setSending(true);
    try {
      const ack = await sendOverSocket(conversationId, body);
      if (!ack.ok) {
        // Sin socket el REST es quien guarda el mensaje, y su respuesta es la
        // única copia que va a existir en esta pantalla: descartarla lo borraba.
        showOwnMessage(await chatService.sendMessage(conversationId, body));
      }
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error : new Error('No se pudo enviar el mensaje.'));
    } finally {
      setSending(false);
    }
  }

  async function sendMedia(file: File, viewOnce: boolean) {
    setSendingMedia(true);
    try {
      // El MIME del archivo decide el tipo; el backend valida que coincidan.
      const type = file.type.startsWith('video/') ? ('video' as const) : ('image' as const);
      showOwnMessage(await chatService.sendMediaMessage(conversationId, file, { type, viewOnce }));
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error : new Error('No se pudo enviar el archivo.'));
    } finally {
      setSendingMedia(false);
    }
  }

  function sendLocation() {
    if (!navigator.geolocation) {
      notify.error(new Error('Este navegador no puede compartir tu ubicación.'));
      return;
    }
    setSendingMedia(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          showOwnMessage(
            await chatService.sendLocationMessage(conversationId, {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            }),
          );
        } catch (error: unknown) {
          notify.error(
            error instanceof Error ? error : new Error('No se pudo enviar tu ubicación.'),
          );
        } finally {
          setSendingMedia(false);
        }
      },
      // Denegar el permiso no es un fallo del que informar con detalle: la
      // persona acaba de decir que no, y ya sabe por qué no hay ubicación.
      () => {
        setSendingMedia(false);
        notify.error(new Error('No se pudo obtener tu ubicación.'));
      },
    );
  }

  return { sendLocation, sendMedia, sendText, sending, sendingMedia };
}
