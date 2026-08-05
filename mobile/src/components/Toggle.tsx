import React from 'react';
import { Pressable, View } from 'react-native';

interface ToggleProps {
  value: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
}

/** Pill switch matching the design's availability toggle. */
export function Toggle({ value, onChange, disabled }: ToggleProps) {
  return (
    <Pressable
      onPress={() => !disabled && onChange?.(!value)}
      disabled={disabled}
      style={{ width: 46, height: 26 }}
      className={`justify-center rounded-full ${value ? 'bg-brand' : 'bg-line'} ${disabled ? 'opacity-60' : ''}`}
    >
      <View
        style={{ width: 20, height: 20, marginHorizontal: 3, alignSelf: value ? 'flex-end' : 'flex-start' }}
        className="rounded-full bg-white"
      />
    </Pressable>
  );
}
