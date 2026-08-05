import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

interface ScreenProps {
  children: React.ReactNode;
  className?: string;
  // When the top of the screen is a gradient header, let it draw under the status bar.
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  statusBarStyle?: 'light' | 'dark';
}

/**
 * Base screen wrapper. Defaults to the canvas background and a light status bar
 * (screens open with a gradient header). Pass `edges` to control safe-area sides.
 */
export function Screen({ children, className, edges = ['bottom'], statusBarStyle = 'light' }: ScreenProps) {
  return (
    <View className="flex-1 bg-canvas">
      <StatusBar style={statusBarStyle} />
      <SafeAreaView edges={edges} className={`flex-1 ${className ?? ''}`}>
        {children}
      </SafeAreaView>
    </View>
  );
}
