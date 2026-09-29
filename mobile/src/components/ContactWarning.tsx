import { View, Text } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';
import { contactWarningMessage } from '../lib/contactWarning';

/** Warns a driver mid-typing that their text contains contact details. */
export function ContactWarning({ value }: { value: string }) {
  const message = contactWarningMessage(value);
  if (!message) return null;
  return (
    <View className="mt-2 flex-row gap-2 rounded-xl border border-[#f0dcae] bg-[#fdf7e8] px-3 py-2">
      <TriangleAlert size={14} color="#a86a15" strokeWidth={2.2} style={{ marginTop: 2 }} />
      <Text className="flex-1 font-semi text-[11.5px] leading-[17px] text-[#7a5410]">{message}</Text>
    </View>
  );
}

export default ContactWarning;
