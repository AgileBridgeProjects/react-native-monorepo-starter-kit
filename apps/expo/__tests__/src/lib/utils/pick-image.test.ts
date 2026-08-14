import { pickImage } from '@lib/utils/pick-image';
import * as ImagePicker from 'expo-image-picker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: vi.fn(),
  launchImageLibraryAsync: vi.fn(),
}));

describe('pickImage', () => {
  beforeEach(() => {
    vi.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValue({
      granted: true,
      status: 'granted' as ImagePicker.PermissionStatus,
      canAskAgain: true,
      expires: 'never',
    });
  });

  it('returns permissionDenied without launching the picker', async () => {
    vi.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValue({
      granted: false,
      status: 'denied' as ImagePicker.PermissionStatus,
      canAskAgain: true,
      expires: 'never',
    });

    const result = await pickImage({ maxSizeBytes: 1000, fileName: 'photo.jpg' });

    expect(result).toEqual({ status: 'permissionDenied' });
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it('returns canceled when the user dismisses the picker', async () => {
    vi.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: true,
      assets: null,
    });

    const result = await pickImage({ maxSizeBytes: 1000, fileName: 'photo.jpg' });

    expect(result).toEqual({ status: 'canceled' });
  });

  it('returns tooLarge when the asset exceeds the caller-provided limit', async () => {
    vi.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://photo.jpg', fileSize: 2000 } as ImagePicker.ImagePickerAsset],
    });

    const result = await pickImage({ maxSizeBytes: 1000, fileName: 'photo.jpg' });

    expect(result).toEqual({ status: 'tooLarge' });
  });

  it('returns a JPEG file object for a picked asset within the size limit', async () => {
    vi.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file://photo.heic',
          fileSize: 500,
          mimeType: 'image/heic',
        } as ImagePicker.ImagePickerAsset,
      ],
    });

    const result = await pickImage({ maxSizeBytes: 1000, fileName: 'avatar.jpg' });

    expect(result).toEqual({
      status: 'picked',
      file: { uri: 'file://photo.heic', name: 'avatar.jpg', type: 'image/jpeg' },
    });
  });

  it('passes editing options through to the picker', async () => {
    vi.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: true,
      assets: null,
    });

    await pickImage({
      maxSizeBytes: 1000,
      fileName: 'photo.jpg',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        exif: false,
      }),
    );
  });
});
