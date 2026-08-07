import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

// Append a picked local image to a FormData for upload.
// React Native 0.76+ (new architecture) uses a spec-strict FormData that rejects
// the old { uri, name, type } object ("Unsupported FormDataPart implementation"),
// so we read the file into a Blob and append that instead.
export const appendImage = async (form: FormData, field: string, uri: string): Promise<void> => {
  const response = await fetch(uri);
  const blob = await response.blob();
  const name = uri.split('/').pop()?.split('?')[0] || `${field}.jpg`;
  form.append(field, blob, name);
};

const ensurePermission = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'Allow photo library access to add images.');
    return false;
  }
  return true;
};

export const pickImage = async (): Promise<string | null> => {
  if (!(await ensurePermission())) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsEditing: true,
  });
  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0].uri;
};

export const pickImages = async (limit = 5): Promise<string[]> => {
  if (!(await ensurePermission())) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsMultipleSelection: true,
    selectionLimit: limit,
  });
  if (result.canceled || !result.assets?.length) return [];
  return result.assets.map((a) => a.uri).slice(0, limit);
};
