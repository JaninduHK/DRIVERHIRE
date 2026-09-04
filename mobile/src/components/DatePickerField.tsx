import { useState } from 'react';
import { View, Text, Pressable, Platform, Modal } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import { colors } from '../theme/colors';

const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseISO = (value: string): Date | undefined => {
  if (!value) return undefined;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

/**
 * Tap-to-pick date field. `value`/`onChange` use `YYYY-MM-DD` strings.
 *
 * Android shows the native dialog. iOS presents the inline calendar inside a modal
 * rather than beneath the field: `display="inline"` needs roughly 320pt of width, and
 * these fields are often laid out two-to-a-row (see the Send an offer form), where the
 * calendar collapsed into an unreadable, overlapping grid.
 */
export function DatePickerField({
  label,
  value,
  onChange,
  minimumDate,
  className,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  minimumDate?: Date;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const dateValue = parseISO(value);
  const display = dateValue
    ? dateValue.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Select date';

  const handleAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    setOpen(false);
    if (event.type === 'set' && selected) onChange(toISODate(selected));
  };

  return (
    <View className={className}>
      <Text className="mb-1.5 font-heavy text-[12.5px] text-ink-soft">{label}</Text>
      <Pressable
        onPress={() => setOpen((prev) => !prev)}
        className="h-11 flex-row items-center gap-2 rounded-xl border-[1.5px] border-line bg-white px-3"
      >
        <Calendar size={15} color={colors.mutedSoft} strokeWidth={1.8} />
        <Text className={`font-med text-[13px] ${dateValue ? 'text-ink' : 'text-muted-soft'}`}>{display}</Text>
      </Pressable>

      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={dateValue ?? new Date()}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          onChange={handleAndroidChange}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable className="flex-1 justify-center bg-ink/45 px-5" onPress={() => setOpen(false)}>
            {/* Stop taps inside the card from dismissing the modal. */}
            <Pressable onPress={() => {}} className="overflow-hidden rounded-2xl bg-white">
              <View className="border-b border-line px-4 py-3">
                <Text className="font-heavy text-[14px] text-ink">{label}</Text>
              </View>
              <View className="items-center px-1 py-1">
                <DateTimePicker
                  value={dateValue ?? minimumDate ?? new Date()}
                  mode="date"
                  display="inline"
                  themeVariant="light"
                  minimumDate={minimumDate}
                  onChange={(_event, selected) => selected && onChange(toISODate(selected))}
                />
              </View>
              <Pressable onPress={() => setOpen(false)} className="items-center border-t border-line py-3">
                <Text className="font-heavy text-[14px] text-brand-dark">Done</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}
