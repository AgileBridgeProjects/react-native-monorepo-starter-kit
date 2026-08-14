import * as ImagePicker from 'expo-image-picker';

export interface PickedImageFile {
  uri: string;
  name: string;
  type: string;
}

export interface PickImageOptions {
  /** Reject the pick client-side when the asset exceeds this size. */
  maxSizeBytes: number;
  /** Filename to hand the upload request — extension should match `type` below. */
  fileName: string;
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
}

export type PickImageResult =
  | { status: 'picked'; file: PickedImageFile }
  | { status: 'canceled' }
  | { status: 'permissionDenied' }
  | { status: 'tooLarge' };

/**
 * Shared library-picker flow for every "pick and upload a photo" feature
 * (profile avatar, onboarding photos): requests permission, launches the
 * picker, and enforces the caller's size limit before handing back a file
 * object ready for upload. Callers own their own upload mutation and error
 * messaging — this only wraps the device API plumbing.
 */
export async function pickImage(options: PickImageOptions): Promise<PickImageResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { status: 'permissionDenied' };

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: options.allowsEditing ?? false,
    aspect: options.aspect,
    quality: options.quality ?? 0.7,
    exif: false,
  });
  if (result.canceled) return { status: 'canceled' };

  const asset = result.assets[0];
  if (asset.fileSize && asset.fileSize > options.maxSizeBytes) {
    return { status: 'tooLarge' };
  }

  // The picker re-encodes to JPEG when allowsEditing + quality are set, so always
  // declare image/jpeg. Relying on asset.mimeType sends HEIC/HEIF on some Android
  // devices, which the backend rejects (it only accepts JPEG/PNG/GIF/WebP).
  return {
    status: 'picked',
    file: { uri: asset.uri, name: options.fileName, type: 'image/jpeg' },
  };
}
