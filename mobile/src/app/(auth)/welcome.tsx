import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Car } from 'lucide-react-native';
import { welcomeGradient } from '../../theme/colors';

export default function Welcome() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={welcomeGradient as unknown as [string, string, string]}
      locations={[0, 0.5, 1.3]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={{ flex: 1 }}
    >
      <StatusBar style="light" />
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <View className="flex-1 justify-end px-6 pb-9">
          <View className="mb-auto mt-10 h-[60px] w-[60px] items-center justify-center rounded-[19px] bg-white/[0.16]">
            <Car size={32} color="#fff" strokeWidth={1.7} />
          </View>

          <Text className="font-xheavy text-[33px] leading-[37px] text-white">
            Drive with{'\n'}Car With Driver
          </Text>
          <Text className="mt-3 font-med text-[15px] leading-[23px] text-white/85">
            Get trip requests that match your vehicle, quote your own price and keep every booking in one
            place.
          </Text>

          <View className="mt-7 gap-2.5">
            <Pressable
              onPress={() => router.push('/(auth)/register')}
              className="w-full items-center rounded-[14px] bg-white py-[15px] active:opacity-90"
            >
              <Text className="font-xheavy text-[15px] text-brand-dark">Create driver account</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(auth)/login')}
              className="w-full items-center rounded-[14px] border-[1.5px] border-white/35 bg-white/[0.16] py-[15px] active:opacity-90"
            >
              <Text className="font-xheavy text-[15px] text-white">I already have an account</Text>
            </Pressable>
          </View>

          <Text className="mt-4 text-center font-med text-[12px] leading-[18px] text-white/65">
            Free to join. No commission on the price you quote.
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
