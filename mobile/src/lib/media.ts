import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

// RN multipart file part from a local asset URI.
export const imagePart = (uri: string, fieldName = 'image') => {
  const name = uri.split('/').pop() || `${fieldName}.jpg`;
  const ext = (name.split('.').pop() || 'jpg').toLowerCase();
  const type = ext === 'png' ? 'image/png' : ext === 'heic' ? 'image/heic' : 'image/jpeg';
  // React Native's FormData accepts this shape for file uploads.
  return { uri, name, type } as unknown as Blob;
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
