/**
 * Dónde abre el navegador el socket de chat.
 *
 * `NEXT_PUBLIC_BACKEND_ORIGIN` se hornea en el bundle durante el build (así
 * funcionan las variables `NEXT_PUBLIC_*`), y eso convertía un dato de
 * despliegue en una propiedad de la imagen: cambiar el dominio del backend
 * obligaba a reconstruir, y mientras tanto el chat apuntaba al placeholder del
 * compose — `localhost:3000` visto desde el navegador del usuario, que es su
 * propia máquina. El socket fallaba sin decir por qué.
 *
 * `BACKEND_PUBLIC_ORIGIN` es la misma dirección leída en el servidor, en cada
 * petición, y enviada al cliente como propiedad. Cambiarla es una variable de
 * entorno y un reinicio, no un build. El valor horneado se conserva como
 * respaldo para que el desarrollo local y las pruebas sigan funcionando sin
 * configurar nada.
 */
export function resolveBackendOrigin({
  runtime,
  baked,
}: Readonly<{ runtime?: string; baked: string }>): string {
  const candidate = runtime?.trim();
  if (!candidate) return baked;
  try {
    // Una dirección inválida en la configuración no puede tumbar la pantalla de
    // chat: se descarta y se sigue con la horneada, que al menos es válida.
    //
    // Se exige http/https explícitamente porque `new URL` acepta cosas que no
    // sirven para abrir un socket: el alias interno de la red de Coolify
    // (`gymsheet-backend:3000`) se parsea sin error como un esquema propio y su
    // `origin` es la cadena «null», que llegaría al navegador como dirección de
    // conexión y fallaría sin explicar nada.
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return baked;
    return parsed.origin;
  } catch {
    return baked;
  }
}
