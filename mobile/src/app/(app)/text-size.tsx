import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Check } from 'lucide-react-native';
import { Screen } from '../../components/Screen';
import { GradientHeader } from '../../components/GradientHeader';
import { BodySheet } from '../../components/BodySheet';
import { Card } from '../../components/Card';
import { Divider } from '../../components/Divider';
import { IconButton } from '../../components/IconButton';
import { useFontScale, FONT_SCALE_OPTIONS, FONT_SCALE_VALUES } from '../../lib/fontScale';

export default function TextSize() {
  const router = useRouter();
  const { option, setOption } = useFontScale();

  return (
    <Screen>
      <GradientHeader
        eyebrow="APP SETTINGS"
        title="Text size"
        subtitle="Adjust how large quote requests and chat messages appear."
        left={
          <IconButton onPress={() => router.back()}>
            <ChevronLeft size={18} color="#fff" strokeWidth={2} />
          </IconButton>
        }
      />
      <BodySheet>
        <Card className="overflow-hidden">
          {FONT_SCALE_OPTIONS.map((opt, i) => {
            const active = option === opt.key;
            return (
              <View key={opt.key}>
                {i > 0 ? <Divider /> : null}
                <Pressable
                  onPress={() => setOption(opt.key)}
                  className="flex-row items-center gap-3 px-4 py-3.5 active:bg-hairline"
                >
                  <View className="h-11 w-11 items-center justify-center rounded-[11px] bg-hairline">
                    <Text style={{ fontSize: 15 * FONT_SCALE_VALUES[opt.key] }} className="font-heavy text-ink">
                      {opt.sample}
                    </Text>
                  </View>
                  <Text className="flex-1 font-semi text-[14.5px] text-ink">{opt.label}</Text>
                  {active ? (
                    <View className="h-6 w-6 items-center justify-center rounded-full bg-brand">
                      <Check size={13} color="#fff" strokeWidth={3} />
                    </View>
                  ) : (
                    <View className="h-6 w-6 rounded-full border-2 border-line" />
                  )}
                </Pressable>
              </View>
            );
          })}
        </Card>

        <Card className="mt-3.5 p-4">
          <Text className="font-heavy text-[12.5px] text-ink-soft">Preview</Text>
          <Text style={{ fontSize: 15.5 * FONT_SCALE_VALUES[option] }} className="mt-2 font-heavy text-ink">
            Colombo → Kandy
          </Text>
          <Text
            style={{ fontSize: 13 * FONT_SCALE_VALUES[option], lineHeight: 20 * FONT_SCALE_VALUES[option] }}
            className="mt-1 font-med text-muted"
          >
            Hi, we&apos;re a family of 4 travelling to Sri Lanka and looking for a private driver for our trip.
          </Text>
        </Card>
        <Text className="mt-3 px-1 font-med text-[12px] leading-5 text-muted-soft">
          This only affects text in quote requests and chat messages — not the rest of the app.
        </Text>
      </BodySheet>
    </Screen>
  );
}
