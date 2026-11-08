import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

export type PickResult = { uri: string } | { error: string } | null;

/**
 * Lets the user choose a square profile photo from their library and keeps a copy in the
 * app's documents folder, so it survives cache clean-up. Returns null if they cancel.
 */
export async function pickProfilePhoto(previousUri?: string | null): Promise<PickResult> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { error: 'Photo access is off. You can turn it on in your phone’s settings.' };

  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
  if (result.canceled || !result.assets?.length) return null;

  try {
    const source = new File(result.assets[0].uri);
    const target = new File(Paths.document, `profile-${Date.now()}.jpg`);
    await source.copy(target, { overwrite: true });
    removeProfilePhoto(previousUri);
    return { uri: target.uri };
  } catch {
    // Fall back to the picker's own copy if saving fails.
    return { uri: result.assets[0].uri };
  }
}

export function removeProfilePhoto(uri?: string | null) {
  if (!uri) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // Already gone; nothing to do.
  }
}
