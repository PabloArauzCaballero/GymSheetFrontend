import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { notify } from '@/notifications';
import type { PendingAttachment } from '@/features/routine-community/attachments';

const MAX_BYTES = 25 * 1024 * 1024;

function fromAsset(asset: ImagePicker.ImagePickerAsset): PendingAttachment | null {
  if (asset.fileSize && asset.fileSize > MAX_BYTES) {
    notify.error('El archivo pesa más de 25 MB.');
    return null;
  }
  const video = asset.type === 'video';
  return {
    source: 'local',
    tipo: video ? 'VIDEO' : 'IMAGEN',
    uri: asset.uri,
    name: asset.fileName ?? (video ? 'video.mp4' : 'foto.jpg'),
    mimeType: asset.mimeType ?? (video ? 'video/mp4' : 'image/jpeg'),
    width: asset.width,
    height: asset.height,
    bytes: asset.fileSize,
  };
}

/** Foto o video de la galería. */
export async function pickFromLibrary(): Promise<PendingAttachment | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    notify.error('Necesitas dar permiso para acceder a tus fotos.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.85 });
  return result.canceled || !result.assets[0] ? null : fromAsset(result.assets[0]);
}

/** Foto o video con la cámara. */
export async function pickFromCamera(): Promise<PendingAttachment | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    notify.error('Necesitas dar permiso para usar la cámara.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], quality: 0.85, videoMaxDuration: 60 });
  return result.canceled || !result.assets[0] ? null : fromAsset(result.assets[0]);
}

/** Un archivo del teléfono (PDF, texto o ZIP). */
export async function pickFile(): Promise<PendingAttachment | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'text/plain', 'application/zip'],
    copyToCacheDirectory: true,
  });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  if (asset.size && asset.size > MAX_BYTES) {
    notify.error('El archivo pesa más de 25 MB.');
    return null;
  }
  return {
    source: 'local',
    tipo: 'ARCHIVO',
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType ?? 'application/pdf',
    bytes: asset.size,
  };
}
