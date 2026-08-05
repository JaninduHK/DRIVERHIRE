import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { initials, avatarColor } from '../lib/format';
import { resolveAssetUrl } from '../api/client';

interface AvatarProps {
  name?: string | null;
  uri?: string | null;
  size?: number;
  rounded?: number;
  // Force a color scheme; otherwise derived from the name.
  colored?: boolean;
  className?: string;
}

export function Avatar({ name, uri, size = 44, rounded = 12, colored = true, className }: AvatarProps) {
  const resolved = resolveAssetUrl(uri);
  const { bg, fg } = colored ? avatarColor(name) : { bg: '#e9f8ef', fg: '#0c8a4b' };

  if (resolved) {
    return (
      <Image
        source={{ uri: resolved }}
        style={{ width: size, height: size, borderRadius: rounded }}
        contentFit="cover"
        transition={150}
      />
    );
  }

  return (
    <View
      style={{ width: size, height: size, borderRadius: rounded, backgroundColor: bg }}
      className={`items-center justify-center ${className ?? ''}`}
    >
      <Text style={{ color: fg, fontSize: size * 0.36 }} className="font-xheavy">
        {initials(name)}
      </Text>
    </View>
  );
}
