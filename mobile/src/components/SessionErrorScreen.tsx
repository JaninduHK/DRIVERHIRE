import { View, Text } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { Button } from './Button';
import { colors } from '../theme/colors';

// Shown when the app has a stored session but couldn't confirm it (network
// blip, timeout, server error) — distinct from a real logout, so the token is
// kept and the driver can just retry instead of being forced to log in again.
export function SessionErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center bg-canvas px-8">
      <View className="h-[92px] w-[92px] items-center justify-center rounded-[28px] bg-brand-tint">
        <WifiOff size={38} color={colors.brand} strokeWidth={1.7} />
      </View>
      <Text className="mt-5 text-center font-xheavy text-[20px] text-ink">Couldn&rsquo;t verify your session</Text>
      <Text className="mt-2.5 text-center font-med text-[14.5px] leading-[22px] text-muted">
        Check your connection and try again. Your login hasn&rsquo;t been lost.
      </Text>
      <Button title="Retry" variant="cta" className="mt-6 w-full" onPress={onRetry} />
    </View>
  );
}
