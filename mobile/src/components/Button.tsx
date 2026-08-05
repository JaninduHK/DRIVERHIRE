import React from 'react';
import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import { colors } from '../theme/colors';

type Variant = 'cta' | 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  className?: string;
  textClassName?: string;
}

const containerFor: Record<Variant, string> = {
  cta: 'w-full items-center justify-center rounded-[14px] bg-brand py-[15px] active:bg-brand-dark',
  primary: 'items-center justify-center rounded-[11px] bg-brand px-4 py-[11px] active:bg-brand-dark',
  secondary:
    'items-center justify-center rounded-[11px] border-[1.5px] border-line bg-white px-4 py-[11px] active:bg-hairline',
  ghost: 'items-center justify-center rounded-[11px] px-4 py-[11px] active:opacity-70',
};

const textFor: Record<Variant, string> = {
  cta: 'font-xheavy text-[15px] text-white',
  primary: 'font-heavy text-[13.5px] text-white',
  secondary: 'font-heavy text-[13.5px] text-ink',
  ghost: 'font-heavy text-[13.5px] text-brand-dark',
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  leftIcon,
  className,
  textClassName,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`${containerFor[variant]} ${isDisabled ? 'opacity-60' : ''} ${className ?? ''}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? colors.brand : '#fff'} />
      ) : (
        <View className="flex-row items-center justify-center gap-2">
          {leftIcon}
          <Text className={`${textFor[variant]} ${textClassName ?? ''}`}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}
