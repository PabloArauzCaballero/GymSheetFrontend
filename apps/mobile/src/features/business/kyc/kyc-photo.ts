import { kycImageProblem } from '@gymsheet/domain';

/**
 * A picked KYC photo as an upload part, or why it cannot be sent (pure: runs
 * under `node --test`). The backend reads only JPEG and PNG by their bytes,
 * so a HEIC is refused here with the fix instead of after the upload.
 */
export type KycLocalFile = { uri: string; name: string; mimeType: string };
export type KycPickedAsset = { uri: string; fileName?: string | null; mimeType?: string | null; fileSize?: number | null };

export function kycFileFromAsset(asset: KycPickedAsset, kind: string): KycLocalFile | { error: string } {
  const fromName = asset.fileName?.toLowerCase().endsWith('.png') ? 'image/png' : asset.fileName?.toLowerCase().match(/\.hei[cf]$/u) ? 'image/heic' : null;
  const mimeType = (asset.mimeType ?? fromName ?? 'image/jpeg').toLowerCase();
  const problem = kycImageProblem({ type: mimeType, size: asset.fileSize ?? null });
  if (problem) return { error: problem };
  return { uri: asset.uri, name: `${kind.toLowerCase()}.${mimeType === 'image/png' ? 'png' : 'jpg'}`, mimeType };
}
