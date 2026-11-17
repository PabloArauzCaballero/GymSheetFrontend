import * as ImagePicker from 'expo-image-picker';
import { kycFileFromAsset, type KycLocalFile } from './kyc-photo';

export type PickResult = { file: KycLocalFile } | { error: string } | { cancelled: true };

const shared = {
  mediaTypes: ['images'] as ImagePicker.MediaType[],
  quality: 0.85,
  allowsEditing: false,
  exif: false,
  // iOS hands JPEG instead of HEIC: the backend reads only JPEG and PNG.
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

function toResult(result: ImagePicker.ImagePickerResult, kind: string): PickResult {
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return { cancelled: true };
  const file = kycFileFromAsset(asset, kind);
  return 'error' in file ? file : { file };
}

/**
 * Camera first (back camera for the CI, front for the selfie). Without
 * camera permission, or where there is no camera, it falls back to the
 * gallery so nobody is stuck.
 */
export async function takeKycPhoto(kind: string, camera: 'back' | 'front'): Promise<PickResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync().catch(() => null);
  if (!permission?.granted) return pickKycPhoto(kind);
  try {
    return toResult(
      await ImagePicker.launchCameraAsync({ ...shared, cameraType: camera === 'front' ? ImagePicker.CameraType.front : ImagePicker.CameraType.back }),
      kind,
    );
  } catch {
    return pickKycPhoto(kind);
  }
}

export async function pickKycPhoto(kind: string): Promise<PickResult> {
  return toResult(await ImagePicker.launchImageLibraryAsync({ ...shared, selectionLimit: 1 }), kind);
}
