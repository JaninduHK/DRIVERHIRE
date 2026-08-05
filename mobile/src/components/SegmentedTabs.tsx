import React from 'react';
import { View, Text, Pressable } from 'react-native';

interface SegmentedTabsProps {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
}

export function SegmentedTabs({ options, value, onChange, className }: SegmentedTabsProps) {
  return (
    <View className={`flex-row gap-1.5 rounded-xl bg-[#eef1f0] p-1 ${className ?? ''}`}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            className={`flex-1 items-center rounded-[9px] py-[9px] ${active ? 'bg-brand' : ''}`}
          >
            <Text className={`font-heavy text-[13px] ${active ? 'text-white' : 'text-muted'}`}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
