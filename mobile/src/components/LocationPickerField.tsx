import { useMemo, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, TextInput } from 'react-native';
import { ChevronDown, MapPin, Search, Check } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { LOCATIONS, LOCATION_REGIONS, findLocation } from '../constants/locations';

/**
 * Base-town picker: tap to choose from the fixed town list (grouped by region,
 * searchable), so drivers can't type a misspelt or vague location.
 * `value` is the stored town name; an older value not in the list shows as unselected.
 */
export function LocationPickerField({
  label,
  value,
  onChange,
  hint,
  className,
}: {
  label: string;
  value: string;
  onChange: (name: string) => void;
  hint?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = findLocation(value)?.name ?? '';

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LOCATION_REGIONS.map((region) => ({
      region,
      items: LOCATIONS.filter(
        (location) =>
          location.region === region &&
          (!q || location.name.toLowerCase().includes(q) || location.aliases.some((alias) => alias.includes(q))),
      ),
    })).filter((group) => group.items.length > 0);
  }, [query]);

  const choose = (name: string) => {
    onChange(name);
    setOpen(false);
    setQuery('');
  };

  return (
    <View className={className}>
      <Text className="mb-1.5 font-heavy text-[12.5px] text-ink-soft">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        className="h-12 flex-row items-center gap-2 rounded-xl border-[1.5px] border-line bg-white px-3"
      >
        <MapPin size={15} color={colors.mutedSoft} strokeWidth={1.8} />
        <Text className={`flex-1 font-med text-[14px] ${selected ? 'text-ink' : 'text-muted-soft'}`}>
          {selected || 'Choose the nearest town'}
        </Text>
        <ChevronDown size={16} color={colors.mutedSoft} strokeWidth={1.8} />
      </Pressable>
      {value && !selected ? (
        <Text className="mt-1.5 font-med text-[11.5px] leading-4 text-warn">
          Your current location "{value}" is not in the list. Please choose your town or the nearest one.
        </Text>
      ) : null}
      {hint ? <Text className="mt-1.5 font-med text-[11.5px] leading-4 text-muted-soft">{hint}</Text> : null}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-ink/45" onPress={() => setOpen(false)}>
          {/* Stop taps inside the sheet from closing it. */}
          <Pressable onPress={() => {}} className="max-h-[80%] rounded-t-[24px] bg-white pb-6">
            <View className="border-b border-line px-4 pb-3 pt-4">
              <Text className="font-heavy text-[15px] text-ink">{label}</Text>
              <View className="mt-3 h-11 flex-row items-center gap-2 rounded-xl border-[1.5px] border-line px-3">
                <Search size={15} color={colors.mutedSoft} strokeWidth={1.8} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search town"
                  placeholderTextColor={colors.mutedSoft}
                  autoCapitalize="none"
                  className="flex-1 font-med text-[14px] text-ink"
                />
              </View>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" className="px-4">
              {groups.map((group) => (
                <View key={group.region} className="mt-3">
                  <Text className="mb-1 font-heavy text-[11px] uppercase tracking-wide text-muted-soft">{group.region}</Text>
                  {group.items.map((location) => {
                    const active = location.name === selected;
                    return (
                      <Pressable
                        key={location.slug}
                        onPress={() => choose(location.name)}
                        className={`flex-row items-center justify-between rounded-xl px-3 py-3 ${active ? 'bg-brand-tint' : ''}`}
                      >
                        <Text className={`font-med text-[14px] ${active ? 'text-brand' : 'text-ink'}`}>{location.name}</Text>
                        {active ? <Check size={16} color={colors.brand} strokeWidth={2} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
              {groups.length === 0 ? (
                <Text className="mt-6 text-center font-med text-[13px] text-muted-soft">No town found. Choose the nearest one.</Text>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
