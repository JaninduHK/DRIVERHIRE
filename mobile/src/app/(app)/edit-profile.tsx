import { useState } from 'react';
import { View, Text, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronLeft, Camera, MapPin } from 'lucide-react-native';
import { Screen } from '../../components/Screen';
import { GradientHeader } from '../../components/GradientHeader';
import { BodySheet } from '../../components/BodySheet';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { IconButton } from '../../components/IconButton';
import { Avatar } from '../../components/Avatar';
import { useAuth } from '../../auth/AuthContext';
import { updateProfile } from '../../api/auth';
import { pickImage, imagePart } from '../../lib/media';
import { getDeviceLocation } from '../../lib/location';
import { resolveAssetUrl } from '../../api/client';
import { colors } from '../../theme/colors';
import type { User } from '../../types';

const normalizeUser = (payload: { user: User } | User): User =>
  payload && typeof payload === 'object' && 'user' in payload ? (payload as { user: User }).user : (payload as User);

export default function EditProfile() {
  const router = useRouter();
  const { user, setUser } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [contactNumber, setContactNumber] = useState(user?.contactNumber ?? '');
  const [experienceYears, setExperienceYears] = useState(user?.experienceYears != null ? String(user.experienceYears) : '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [description, setDescription] = useState(user?.description ?? '');
  const [tripAdvisor, setTripAdvisor] = useState(user?.tripAdvisor ?? '');
  const [locationLabel, setLocationLabel] = useState(user?.driverLocation?.label ?? '');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [removePhoto, setRemovePhoto] = useState(false);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const photo = photoUri || (removePhoto ? undefined : resolveAssetUrl(user?.profilePhoto));

  const handlePickPhoto = async () => {
    const uri = await pickImage();
    if (uri) {
      setPhotoUri(uri);
      setRemovePhoto(false);
    }
  };

  const handleUseLocation = async () => {
    setLocating(true);
    try {
      const c = await getDeviceLocation();
      setCoords(c);
    } catch (err) {
      Alert.alert('Location', err instanceof Error ? err.message : 'Unable to get your location.');
    } finally {
      setLocating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('contactNumber', contactNumber.trim());
      fd.append('address', address.trim());
      fd.append('description', description.trim());
      fd.append('tripAdvisor', tripAdvisor.trim());
      fd.append('currentLocationLabel', locationLabel.trim());
      if (experienceYears.trim()) fd.append('experienceYears', String(parseInt(experienceYears, 10) || 0));
      if (coords) {
        fd.append('currentLatitude', String(coords.latitude));
        fd.append('currentLongitude', String(coords.longitude));
      }
      if (photoUri) fd.append('profilePhoto', imagePart(photoUri, 'profilePhoto'));
      if (removePhoto) fd.append('removeProfilePhoto', 'true');

      const updated = normalizeUser(await updateProfile(fd));
      setUser(updated);
      router.back();
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <GradientHeader
          eyebrow="MY PROFILE"
          title="Edit details"
          left={
            <IconButton onPress={() => router.back()}>
              <ChevronLeft size={18} color="#fff" strokeWidth={2} />
            </IconButton>
          }
        />
        <BodySheet>
          {/* Photo */}
          <Card className="flex-row items-center gap-3.5 p-4">
            <Pressable onPress={handlePickPhoto}>
              {photo ? (
                <Image source={{ uri: photo }} style={{ width: 64, height: 64, borderRadius: 16 }} contentFit="cover" />
              ) : (
                <Avatar name={name} size={64} rounded={16} colored={false} />
              )}
            </Pressable>
            <View className="flex-1">
              <Text className="font-heavy text-[13.5px] text-ink">Profile photo</Text>
              <View className="mt-1.5 flex-row gap-2">
                <Pressable onPress={handlePickPhoto} className="rounded-lg border-[1.5px] border-line px-3 py-1.5">
                  <Text className="font-heavy text-[12px] text-ink">Upload</Text>
                </Pressable>
                {photo ? (
                  <Pressable onPress={() => { setPhotoUri(undefined); setRemovePhoto(true); }} className="rounded-lg border-[1.5px] border-[#ffd3d9] px-3 py-1.5">
                    <Text className="font-heavy text-[12px] text-danger">Remove</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </Card>

          {/* Fields */}
          <Card className="mt-3 p-4">
            <TextField label="Name" value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />
            <TextField className="mt-3" label="Contact number" value={contactNumber} onChangeText={setContactNumber} placeholder="e.g. +94 71 555 5555" keyboardType="phone-pad" />
            <TextField className="mt-3" label="Years of driving experience" value={experienceYears} onChangeText={setExperienceYears} placeholder="e.g. 5" keyboardType="number-pad" />
            <TextField className="mt-3" label="Base location" value={address} onChangeText={setAddress} placeholder="City, region" autoCapitalize="words" />
            <TextField className="mt-3" label="Bio" value={description} onChangeText={setDescription} placeholder="Tell travellers about your experience and specialties." multiline />
            <TextField className="mt-3" label="TripAdvisor link" value={tripAdvisor} onChangeText={setTripAdvisor} placeholder="https://" autoCapitalize="none" keyboardType="url" />
          </Card>

          {/* Live location */}
          <Card className="mt-3 p-4">
            <Text className="font-heavy text-[14px] text-ink">Live location</Text>
            <Text className="mt-0.5 font-med text-[12px] text-muted-soft">
              Set your base so the homepage map can spotlight you.
            </Text>
            <Pressable
              onPress={handleUseLocation}
              disabled={locating}
              className="mt-2.5 flex-row items-center justify-center gap-2 rounded-xl border-[1.5px] border-[#cdeede] bg-[#f3fbf6] py-2.5"
            >
              <MapPin size={15} color={colors.brand} strokeWidth={1.8} />
              <Text className="font-heavy text-[13px] text-brand-dark">
                {locating ? 'Locating…' : 'Use my device location'}
              </Text>
            </Pressable>
            <TextField
              className="mt-2.5"
              label="Location label"
              value={locationLabel}
              onChangeText={setLocationLabel}
              placeholder="e.g. Near Kandy city center"
            />
            {coords ? (
              <Text className="mt-1.5 font-heavy text-[12px] text-brand-dark">
                Captured {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
              </Text>
            ) : null}
          </Card>

          <Button title="Save changes" variant="cta" className="mt-3.5" loading={saving} onPress={handleSave} />
        </BodySheet>
      </KeyboardAvoidingView>
    </Screen>
  );
}
