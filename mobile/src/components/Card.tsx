import React from 'react';
import { View } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: object;
}

/** White rounded card with the app's soft shadow. */
export function Card({ children, className, style }: CardProps) {
  return (
    <View
      className={`rounded-[18px] bg-white ${className ?? ''}`}
      style={[
        {
          shadowColor: '#0f1f2d',
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
