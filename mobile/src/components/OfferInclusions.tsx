import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { OFFER_INCLUSIONS } from '../constants/offerInclusions';

/**
 * The six offer inclusions as a tick/cross list: green tick for what the driver
 * included, red cross and grey text for what they did not.
 *
 * Renders nothing when `inclusions` is not an array — offers sent before
 * inclusions existed carry no list, and six crosses would wrongly read as
 * "nothing included".
 */
export function OfferInclusionList({ inclusions, className = '' }: { inclusions?: string[] | null; className?: string }) {
  if (!Array.isArray(inclusions)) return null;
  return (
    <View className={`gap-1 ${className}`}>
      {OFFER_INCLUSIONS.map(({ key, label }) => {
        const included = inclusions.includes(key);
        return (
          <View key={key} className="flex-row items-start gap-1.5" accessibilityLabel={`${label}: ${included ? 'included' : 'not included'}`}>
            {included ? (
              <Check size={15} color="#059669" strokeWidth={3.5} style={{ marginTop: 1 }} />
            ) : (
              <X size={15} color="#f43f5e" strokeWidth={2.5} style={{ marginTop: 1 }} />
            )}
            <Text className={`flex-1 text-[12.5px] ${included ? 'font-heavy text-ink' : 'font-med text-muted-soft'}`}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** Checkbox group for the offer forms. `value` is the array of selected keys. */
export function OfferInclusionPicker({
  value,
  onChange,
  className = '',
}: {
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
}) {
  const toggle = (key: string) =>
    onChange(value.includes(key) ? value.filter((item) => item !== key) : [...value, key]);
  return (
    <View className={className}>
      <Text className="mb-1.5 font-heavy text-[12.5px] text-ink-soft">What's included in this price</Text>
      <View className="gap-1.5">
        {OFFER_INCLUSIONS.map(({ key, label }) => {
          const checked = value.includes(key);
          return (
            <Pressable
              key={key}
              onPress={() => toggle(key)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              className={`flex-row items-center gap-2.5 rounded-xl border-[1.5px] px-3 py-2.5 ${checked ? 'border-brand bg-brand-tint' : 'border-line bg-white'}`}
            >
              <View className={`h-5 w-5 items-center justify-center rounded-md border-[1.5px] ${checked ? 'border-brand bg-brand' : 'border-line bg-white'}`}>
                {checked ? <Check size={13} color="#ffffff" strokeWidth={3.5} /> : null}
              </View>
              <Text className={`flex-1 text-[13px] ${checked ? 'font-heavy text-ink' : 'font-med text-muted'}`}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="mt-1 font-med text-[11px] text-muted-soft">
        Travellers see every item: ticked ones as included, the rest as not included.
      </Text>
    </View>
  );
}
