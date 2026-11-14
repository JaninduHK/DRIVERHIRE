import { View, Text, Pressable } from 'react-native';
import { MAX_SERVICE_AREAS, SERVICE_AREAS } from '../constants/locations';

/**
 * "Also available in": up to MAX_SERVICE_AREAS city areas the driver regularly picks
 * up from, besides their base town. `value` is a list of area slugs.
 */
export function ServiceAreasPicker({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
}) {
  const full = value.length >= MAX_SERVICE_AREAS;
  const toggle = (slug: string) => {
    if (value.includes(slug)) onChange(value.filter((item) => item !== slug));
    else if (!full) onChange([...value, slug]);
  };
  return (
    <View className={className}>
      <Text className="mb-1.5 font-heavy text-[12.5px] text-ink-soft">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {SERVICE_AREAS.map((area) => {
          const on = value.includes(area.slug);
          const blocked = !on && full;
          return (
            <Pressable
              key={area.slug}
              onPress={() => toggle(area.slug)}
              disabled={blocked}
              accessibilityState={{ selected: on, disabled: blocked }}
              className={`rounded-full px-3.5 py-2 ${on ? 'bg-brand' : 'border-[1.5px] border-line bg-white'} ${blocked ? 'opacity-40' : ''}`}
            >
              <Text className={`font-heavy text-[12.5px] ${on ? 'text-white' : 'text-ink-soft'}`}>{area.name}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="mt-1.5 font-med text-[11.5px] leading-4 text-muted-soft">
        Optional. Pick up to {MAX_SERVICE_AREAS} areas where you regularly pick up travellers ({value.length} of {MAX_SERVICE_AREAS} chosen).
      </Text>
    </View>
  );
}
