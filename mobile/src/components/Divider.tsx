import React from 'react';
import { View } from 'react-native';

/** Thin hairline separator inside list cards (.sep). */
export function Divider({ className }: { className?: string }) {
  return <View className={`mx-[14px] h-px bg-hairline ${className ?? ''}`} />;
}
