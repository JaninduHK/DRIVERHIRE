import React from 'react';
import { View, Text, Pressable } from 'react-native';

type Tone = 'neutral' | 'brand' | 'warn' | 'info' | 'purple';

const toneStyles: Record<Tone, { bg: string; text: string; border?: string }> = {
  neutral: { bg: 'bg-[#eef1f0]', text: 'text-ink-soft' },
  brand: { bg: 'bg-brand-tint', text: 'text-brand-dark' },
  warn: { bg: 'bg-warn-tint', text: 'text-warn' },
  info: { bg: 'bg-[#e5f0fb]', text: 'text-[#1d6fb8]' },
  purple: { bg: 'bg-[#e7ddfb]', text: 'text-[#6b3fc0]' },
};

interface ChipProps {
  label: string;
  tone?: Tone;
  selected?: boolean;
  onPress?: () => void;
  className?: string;
}

/** Small pill: filter tags, statuses, selectable language chips. */
export function Chip({ label, tone = 'neutral', selected, onPress, className }: ChipProps) {
  const t = toneStyles[tone];
  const selectedCls = selected
    ? 'border-[1.5px] border-brand bg-brand-tint'
    : onPress
      ? 'border-[1.5px] border-line bg-white'
      : t.bg;
  const textCls = selected ? 'text-brand-dark' : onPress ? 'text-muted' : t.text;

  const content = (
    <View className={`rounded-full px-[11px] py-[6px] ${selectedCls} ${className ?? ''}`}>
      <Text className={`font-heavy text-[11.5px] ${textCls}`}>{label}</Text>
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}
