import * as Location from 'expo-location';

export interface DeviceCoords {
  latitude: number;
  longitude: number;
}

/** Request foreground permission and return the current coordinates. */
export const getDeviceLocation = async (): Promise<DeviceCoords> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission is required to use your device location.');
  }
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
};
