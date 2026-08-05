import { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import { colors } from '../theme/colors';

const logo = require('../../assets/logo.png');

/** White loading screen: our logo with a gentle pulse + animated dots. */
export function AnimatedSplash() {
  const pulse = useRef(new Animated.Value(0)).current;
  const dots = useRef([new Animated.Value(0.3), new Animated.Value(0.3), new Animated.Value(0.3)]).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );

    const dotLoops = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(d, { toValue: 1, duration: 380, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.3, duration: 380, easing: Easing.in(Easing.ease), useNativeDriver: true }),
          Animated.delay((2 - i) * 160),
        ])
      )
    );

    pulseLoop.start();
    dotLoops.forEach((l) => l.start());
    return () => {
      pulseLoop.stop();
      dotLoops.forEach((l) => l.stop());
    };
  }, [pulse, dots]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Animated.Image
        source={logo}
        resizeMode="contain"
        style={{ width: 230, height: 68, opacity, transform: [{ scale }] }}
      />
      <View className="mt-8 flex-row gap-2">
        {dots.map((d, i) => (
          <Animated.View
            key={i}
            style={{ opacity: d, transform: [{ scale: d }] }}
            className="h-2.5 w-2.5 rounded-full"
          >
            <View style={{ flex: 1, borderRadius: 999, backgroundColor: colors.brand }} />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}
