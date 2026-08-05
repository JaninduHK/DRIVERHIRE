import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { headerGradient } from '../theme/colors';

interface GradientHeaderProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode;
  // Bottom padding — larger values give the body sheet more overlap room.
  pb?: number;
}

export function GradientHeader({
  eyebrow,
  title,
  subtitle,
  left,
  right,
  children,
  pb = 56,
}: GradientHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={headerGradient as unknown as [string, string, string]}
      locations={[0, 0.55, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ paddingTop: insets.top + 8, paddingBottom: pb }}
    >
      {(left || right) && (
        <View className="flex-row items-center justify-between px-5">
          <View>{left}</View>
          <View>{right}</View>
        </View>
      )}
      {(eyebrow || title || subtitle || children) && (
        <View className="px-6 pt-3.5">
          {eyebrow ? (
            <Text className="font-xheavy text-[12px] tracking-[1.2px] text-white/80">{eyebrow}</Text>
          ) : null}
          {title ? <Text className="mt-1 font-xheavy text-[25px] text-white">{title}</Text> : null}
          {subtitle ? (
            <Text className="mt-1.5 font-med text-[13.5px] text-white/85">{subtitle}</Text>
          ) : null}
          {children}
        </View>
      )}
    </LinearGradient>
  );
}
