import React from 'react';
import { Pressable } from 'react-native';

interface IconButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'header' | 'plain';
  className?: string;
}

/** The translucent 40x40 rounded icon button used across gradient headers. */
export function IconButton({ children, onPress, variant = 'header', className }: IconButtonProps) {
  const base =
    variant === 'header'
      ? 'bg-white/20 active:bg-white/30'
      : 'bg-white border border-line active:bg-hairline';
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      className={`h-10 w-10 items-center justify-center rounded-xl ${base} ${className ?? ''}`}
    >
      {children}
    </Pressable>
  );
}
