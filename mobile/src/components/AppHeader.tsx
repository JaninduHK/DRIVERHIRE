import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Menu, Bell } from 'lucide-react-native';
import { GradientHeader } from './GradientHeader';
import { IconButton } from './IconButton';
import { useAuth } from '../auth/AuthContext';
import { initials } from '../lib/format';
import { resolveAssetUrl } from '../api/client';

function HeaderAvatar() {
  const router = useRouter();
  const { user } = useAuth();
  const uri = resolveAssetUrl(user?.profilePhoto);
  return (
    <Pressable onPress={() => router.push('/(app)/(tabs)/profile')}>
      {uri ? (
        <Image source={{ uri }} style={{ width: 40, height: 40, borderRadius: 12 }} contentFit="cover" />
      ) : (
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
          <Text className="font-xheavy text-[15px] text-brand">{initials(user?.name)}</Text>
        </View>
      )}
    </Pressable>
  );
}

interface AppHeaderProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  showBell?: boolean;
  hasNotifications?: boolean;
  pb?: number;
}

/** Standard tab-screen header: hamburger (opens menu), optional bell, avatar. */
export function AppHeader({
  eyebrow,
  title,
  subtitle,
  children,
  showBell = false,
  hasNotifications = false,
  pb = 56,
}: AppHeaderProps) {
  const router = useRouter();
  return (
    <GradientHeader
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      pb={pb}
      left={
        <IconButton onPress={() => router.push('/(app)/menu')}>
          <Menu size={18} color="#fff" strokeWidth={2} />
        </IconButton>
      }
      right={
        <View className="flex-row items-center gap-2">
          {showBell ? (
            <IconButton onPress={() => router.push('/(app)/notifications')}>
              <View>
                <Bell size={17} color="#fff" strokeWidth={1.8} />
                {hasNotifications ? (
                  <View className="absolute -right-1 -top-1 h-2 w-2 rounded-full border-2 border-brand bg-[#ffd23f]" />
                ) : null}
              </View>
            </IconButton>
          ) : null}
          <HeaderAvatar />
        </View>
      }
    >
      {children}
    </GradientHeader>
  );
}
