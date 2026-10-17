import { File } from 'expo-file-system';
import { Platform } from 'react-native';

export type LocalFile = { uri: string; name: string; mimeType: string };

/**
 * Añade un archivo local a un `FormData` de subida.
 *
 * Expo 57 instala `expo/fetch` como `fetch` global, y ese `fetch` no entiende
 * la parte propietaria de React Native `{ uri, name, type }`: al serializar el
 * multipart lanza «Unsupported FormDataPart implementation» antes de abrir la
 * conexión, y el cliente lo reportaba como «No se pudo conectar con el
 * servicio». Ninguna foto, audio, story ni reel llegaba al servidor.
 *
 * `expo/fetch` sí serializa cualquier objeto con `bytes()`, y toma `name` y
 * `type` para la cabecera de la parte; el `File` de expo-file-system lee el
 * archivo local sin pasar por base64. En la web el selector devuelve una URL
 * `blob:`/`data:` y el `FormData` del navegador quiere un `Blob` de verdad.
 */
export async function appendLocalFile(form: FormData, field: string, file: LocalFile): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(file.uri)).blob();
    form.append(field, new Blob([blob], { type: file.mimeType }), file.name);
    return;
  }
  const source = new File(file.uri);
  form.append(field, {
    name: file.name,
    type: file.mimeType,
    bytes: () => source.bytes(),
  } as unknown as Blob);
}
