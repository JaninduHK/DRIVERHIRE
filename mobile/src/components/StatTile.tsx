import React from 'react';
import { View, Text } from 'react-native';
import { Card } from './Card';

interface StatTileProps {
  value: React.ReactNode;
  label: string;
  className?: string;
}

/** Compact metric tile (This month / Upcoming / Rating). */
export function StatTile({ value, label, className }: StatTileProps) {
  return (
    <Card className={`flex-1 rounded-2xl p-[13px] ${className ?? ''}`}>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text className="font-xheavy text-[22px] text-ink">{value}</Text>
      ) : (
        value
      )}
      <Text className="mt-0.5 font-semi text-[11px] text-muted-soft">{label}</Text>
    </Card>
  );
}
