import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';

export function Loading({ label }: { label?: string }) {
  return (
    <View className="items-center justify-center py-16">
      <ActivityIndicator color={colors.brand} />
      {label ? <Text className="mt-3 font-med text-[13px] text-muted">{label}</Text> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View className="items-center justify-center px-6 py-14">
      <Text className="text-center font-heavy text-[15px] text-ink">Something went wrong</Text>
      <Text className="mt-2 text-center font-med text-[13px] text-muted">
        {message ?? 'Please try again.'}
      </Text>
      {onRetry ? (
        <Text onPress={onRetry} className="mt-4 font-heavy text-[13.5px] text-brand-dark">
          Retry
        </Text>
      ) : null}
    </View>
  );
}

export function EmptyState({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}) {
  return (
    <View className="items-center justify-center px-6 py-12">
      {icon ? <View className="mb-3">{icon}</View> : null}
      <Text className="text-center font-heavy text-[15px] text-ink">{title}</Text>
      {subtitle ? (
        <Text className="mt-1.5 text-center font-med text-[13px] leading-5 text-muted">{subtitle}</Text>
      ) : null}
    </View>
  );
}
