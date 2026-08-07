import { useState } from 'react';
import { View, Text, Pressable, Alert, Linking, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu, BadgeCheck, Star, Camera, Pencil, KeyRound, Bell, LifeBuoy, ChevronRight } from 'lucide-react-native';
import { Screen } from '../../../components/Screen';
import { Card } from '../../../components/Card';
import { Divider } from '../../../components/Divider';
import { IconButton } from '../../../components/IconButton';
import { useAuth } from '../../../auth/AuthContext';
import { useOverview } from '../../../hooks/queries';
import { updateProfile } from '../../../api/auth';
import { pickImage, appendImage } from '../../../lib/media';
import { initials } from '../../../lib/format';
import { resolveAssetUrl } from '../../../api/client';
import { colors, headerGradient } from '../../../theme/colors';
import type { User } from '../../../types';

const normalizeUser = (payload: { user: User } | User): User =>
  payload && typeof payload === 'object' && 'user' in payload ? (payload as { user: User }).user : (payload as User);

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, setUser, logout } = useAuth();
  const overview = useOverview();

  const [uploading, setUploading] = useState(false);

  const rating = overview.data?.activity?.rating || 0;
  const trips = overview.data?.activity?.totalTrips || 0;
  const photo = resolveAssetUrl(user?.profilePhoto);

  const handlePhoto = async () => {
    const uri = await pickImage();
    if (!uri) return;
    setUploading(true);
    try {
      const form = new FormData();
      await appendImage(form, 'profilePhoto', uri);
      const updated = normalizeUser(await updateProfile(form));
      setUser(updated);
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/welcome');
  };

  return (
    <Screen edges={[]}>
      <LinearGradient
        colors={headerGradient as unknown as [string, string, string]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 70 }}
      >
        <View className="flex-row items-center justify-between px-5">
          <IconButton onPress={() => router.push('/(app)/menu')}>
            <Menu size={18} color="#fff" strokeWidth={2} />
          </IconButton>
          <Pressable onPress={handleLogout} className="rounded-xl bg-white/[0.18] px-3.5 py-2.5">
            <Text className="font-heavy text-[13px] text-white">Log out</Text>
          </Pressable>
        </View>
      </LinearGradient>

      <View className="-mt-14 flex-1 rounded-t-[28px] bg-canvas" style={{ overflow: 'visible' }}>
        {/* Identity — outside the ScrollView so the avatar can overlap the header without being clipped */}
        <View className="-mt-11 items-center px-[18px]">
          <Pressable
            onPress={handlePhoto}
            className="rounded-3xl bg-white p-1"
            style={{ shadowColor: '#0f1f2d', shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 4 }}
          >
            {photo ? (
              <Image source={{ uri: photo }} style={{ width: 80, height: 80, borderRadius: 20 }} contentFit="cover" />
            ) : (
              <View className="h-20 w-20 items-center justify-center rounded-[20px] bg-brand">
                <Text className="font-xheavy text-[30px] text-white">{initials(user?.name)}</Text>
              </View>
            )}
            {/* Change-photo icon badge */}
            <View className="absolute -bottom-1 -right-1 h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand">
              <Camera size={13} color="#fff" strokeWidth={2} />
            </View>
          </Pressable>
          <View className="mt-3 flex-row items-center gap-1.5">
            <Text className="font-xheavy text-[20px] text-ink">{user?.name}</Text>
            <BadgeCheck size={18} color={colors.brand} fill={colors.brand} />
          </View>
          <Text className="mt-0.5 font-semi text-[13px] text-muted-soft">
            Approved driver{user?.address ? `, ${user.address}` : ''}
          </Text>
          {uploading ? <Text className="mt-1.5 font-med text-[12px] text-muted">Updating photo…</Text> : null}

          <View className="mt-3.5 flex-row gap-5">
            <Stat value={rating ? rating.toFixed(1) : '—'} label="Rating" star />
            <View className="w-px bg-line" />
            <Stat value={String(trips)} label="Trips" />
            <View className="w-px bg-line" />
            <Stat value={`${user?.experienceYears ?? 0}y`} label="Driving" />
          </View>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16, paddingTop: 18 }}
        >
          <View className="px-[18px]">
            {/* About */}
            <Card className="p-4">
              <Text className="font-heavy text-[14px] text-ink">About you</Text>
              <Text className="mt-2 font-med text-[13px] leading-5 text-muted">
                {user?.description || 'Add a short bio so travellers know what makes your tours special.'}
              </Text>
            </Card>

            {/* Settings */}
            <Card className="mt-3 px-1 py-1.5">
              <SettingRow icon={Pencil} label="Edit profile details" onPress={() => router.push('/(app)/edit-profile')} />
              <Divider />
              <SettingRow icon={KeyRound} label="Change password" onPress={() => router.push('/(app)/change-password')} />
              <Divider />
              <SettingRow icon={Bell} label="Notifications" onPress={() => router.push('/(app)/notifications')} />
              <Divider />
              <SettingRow icon={LifeBuoy} label="Help and support" onPress={() => Linking.openURL('mailto:support@carwithdriver.lk')} />
            </Card>
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

function Stat({ value, label, star }: { value: string; label: string; star?: boolean }) {
  return (
    <View className="items-center">
      <View className="flex-row items-center gap-0.5">
        <Text className="font-xheavy text-[18px] text-ink">{value}</Text>
        {star ? <Star size={13} color={colors.star} fill={colors.star} /> : null}
      </View>
      <Text className="font-semi text-[11px] text-muted-soft">{label}</Text>
    </View>
  );
}

function SettingRow({ icon: Icon, label, onPress }: { icon: typeof Pencil; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 px-3 py-3.5 active:bg-hairline">
      <Icon size={19} color={colors.muted} strokeWidth={1.8} />
      <Text className="flex-1 font-semi text-[14px] text-ink">{label}</Text>
      <ChevronRight size={16} color="#c3ccd3" strokeWidth={2} />
    </Pressable>
  );
}
