import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { colors } from '../theme/colors';

interface BodySheetProps {
  children: React.ReactNode;
  // Negative top margin to overlap the gradient header (design uses ~40).
  overlap?: number;
  contentClassName?: string;
  scroll?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  bottomInset?: number;
}

/** Rounded canvas sheet that overlaps the gradient header and hosts scrollable content. */
export function BodySheet({
  children,
  overlap = 40,
  contentClassName,
  scroll = true,
  onRefresh,
  refreshing = false,
  bottomInset = 28,
}: BodySheetProps) {
  const inner = (
    <View className={`px-[18px] pt-[18px] ${contentClassName ?? ''}`} style={{ paddingBottom: bottomInset }}>
      {children}
    </View>
  );

  return (
    <View
      className="flex-1 overflow-hidden rounded-t-[28px] bg-canvas"
      style={{ marginTop: -overlap }}
    >
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
            ) : undefined
          }
        >
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </View>
  );
}
