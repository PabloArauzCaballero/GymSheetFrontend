import { ApiError, createBusinessListingsServices, createPublicMarketplaceServices } from '@gymsheet/api-client';
import { listingErrorMessage } from '@gymsheet/domain';
import * as ImagePicker from 'expo-image-picker';
import { apiClient } from '@/api/client';
import { appendLocalFile, type LocalFile } from '@/api/local-file-part';
import { kycFileFromAsset } from '@/features/business/kyc/kyc-photo';

/** Listings, locations and gallery of the business (ADR-0022): the same shared services as the web. */
export const listingsService = createBusinessListingsServices(apiClient.request, apiClient.upload);

/** The public marketplace (search, listing, profile by @handle) and «Reportar». */
export const marketplaceService = createPublicMarketplaceServices(apiClient.request);

export async function photoForm(file: LocalFile): Promise<FormData> {
  const form = new FormData();
  await appendLocalFile(form, 'file', file);
  return form;
}

/**
 * Photos from the library, JPEG/PNG only (iOS hands JPEG instead of HEIC).
 * Returns the usable files and how many were refused, so the screen can say it.
 */
export async function pickPhotos(limit: number): Promise<{ files: LocalFile[]; refused: number }> {
  if (limit <= 0) return { files: [], refused: 0 };
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    exif: false,
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (result.canceled) return { files: [], refused: 0 };
  const files: LocalFile[] = [];
  let refused = 0;
  result.assets.slice(0, limit).forEach((asset, index) => {
    const file = kycFileFromAsset(asset, `foto-${index + 1}`);
    if ('error' in file) refused += 1;
    else files.push(file);
  });
  return { files, refused };
}

/** The Spanish text of a listings error: our copy for its code, else the server's message. */
export function listingErrorText(error: unknown): string {
  if (error instanceof ApiError) return listingErrorMessage(error.code, error.message, error.details);
  return error instanceof Error ? error.message : 'Algo salió mal. Vuelve a intentarlo.';
}
