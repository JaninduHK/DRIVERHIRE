import React from 'react';
import { View, Text } from 'react-native';

interface BadgeProps {
  count?: number;
  label?: string;
  tone?: 'danger' | 'brand';
  className?: string;
}

/** Small count/notification pill. */
export function Badge({ count, label, tone = 'danger', className }: BadgeProps) {
  const text = label ?? (count != null ? String(count) : '');
  if (!text) return null;
  const bg = tone === 'danger' ? 'bg-danger' : 'bg-brand';
  return (
    <View className={`min-w-[18px] items-center justify-center rounded-full px-[6px] py-[1px] ${bg} ${className ?? ''}`}>
      <Text className="font-xheavy text-[11px] text-white">{text}</Text>
    </View>
  );
}
