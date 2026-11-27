import React from 'react';
import { Text, View } from 'react-native';
import { BadgeCheck, CalendarX2, ShieldCheck, Wallet } from 'lucide-react-native';
import { colors } from '../theme/colors';

const DAY_MS = 24 * 60 * 60 * 1000;

const utcDay = (value: string) => {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

/** True when the trip runs over more than one day. */
export const isMultiDayTrip = (startDate?: string, endDate?: string) =>
  Boolean(startDate && endDate) && Math.round((utcDay(endDate!) - utcDay(startDate!)) / DAY_MS) >= 1;

/**
 * The "Good to know" block the traveller sees under an offer on the website, shown
 * here so the driver knows what was promised. Verification lines come from the
 * server and only appear when true; payment and cancellation apply to every offer.
 */
export function OfferAssurances({
  startDate,
  endDate,
  assurances,
  className = '',
}: {
  startDate?: string;
  endDate?: string;
  assurances?: { licenceVerified?: boolean; insuranceVerified?: boolean } | null;
  className?: string;
}) {
  const lines = [
    assurances?.licenceVerified ? { key: 'licence', Icon: BadgeCheck, text: 'SLTDA licence verified' } : null,
    assurances?.insuranceVerified ? { key: 'insurance', Icon: ShieldCheck, text: 'Passenger insurance verified' } : null,
    {
      key: 'pay',
      Icon: Wallet,
      text: isMultiDayTrip(startDate, endDate)
        ? 'No deposit · pay 50% on the first day, the rest on the last day'
        : 'No deposit · pay on arrival',
    },
    { key: 'cancel', Icon: CalendarX2, text: 'Free to cancel up to 2 days before the start' },
  ].filter(Boolean) as { key: string; Icon: typeof Wallet; text: string }[];

  return (
    <View className={`rounded-xl bg-[#f3faf6] px-3 py-2.5 ${className}`}>
      <Text className="mb-1.5 font-xheavy text-[10.5px] uppercase text-brand-dark">Good to know</Text>
      <View className="gap-1.5">
        {lines.map(({ key, Icon, text }) => (
          <View key={key} className="flex-row items-start gap-1.5">
            <Icon size={15} color={colors.brand} strokeWidth={2} style={{ marginTop: 1 }} />
            <Text className="flex-1 font-heavy text-[12.5px] text-ink">{text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
