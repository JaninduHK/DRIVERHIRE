import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, type KeyboardTypeOptions } from 'react-native';
import { colors } from '../theme/colors';

interface TextFieldProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  prefix?: string;
  multiline?: boolean;
  rightSlot?: React.ReactNode;
  labelRight?: React.ReactNode;
  className?: string;
  autoFocus?: boolean;
  editable?: boolean;
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secure = false,
  keyboardType,
  autoCapitalize = 'sentences',
  prefix,
  multiline = false,
  rightSlot,
  labelRight,
  className,
  autoFocus,
  editable = true,
}: TextFieldProps) {
  const [hidden, setHidden] = useState(secure);

  return (
    <View className={className}>
      {(label || labelRight) && (
        <View className="mb-1.5 flex-row items-center justify-between">
          {label ? <Text className="font-heavy text-[12.5px] text-ink-soft">{label}</Text> : <View />}
          {labelRight}
        </View>
      )}
      <View
        className={`flex-row items-center rounded-xl border-[1.5px] border-line bg-white px-[13px] ${
          multiline ? 'py-3' : 'h-12'
        }`}
      >
        {prefix ? <Text className="mr-2 font-heavy text-[14px] text-ink">{prefix}</Text> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          multiline={multiline}
          autoFocus={autoFocus}
          editable={editable}
          className="flex-1 font-semi text-[14px] text-ink"
          style={multiline ? { minHeight: 66, textAlignVertical: 'top' } : undefined}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8} className="rounded-lg bg-[#eef7f2] px-[11px] py-[6px]">
            <Text className="font-heavy text-[12.5px] text-brand-dark">{hidden ? 'Show' : 'Hide'}</Text>
          </Pressable>
        ) : (
          rightSlot
        )}
      </View>
    </View>
  );
}
