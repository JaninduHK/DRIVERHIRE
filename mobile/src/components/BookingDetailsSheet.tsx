import type { ComponentType } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Linking } from 'react-native';
import { X, Calendar, MapPin, Plane, User2, Mail, Phone, Car } from 'lucide-react-native';
import { formatDateRange } from '../lib/format';
import { colors } from '../theme/colors';
import type { Booking } from '../types';

const statusChip = (status: string) => {
  if (status === 'confirmed') return { bg: 'bg-brand-tint', text: 'text-brand-dark' };
  if (status === 'pending') return { bg: 'bg-[#fdf0d8]', text: 'text-[#a86a15]' };
  return { bg: 'bg-[#eef1f0]', text: 'text-muted' };
};

/**
 * Full booking details as a bottom sheet. Accepts both the driver-bookings shape
 * (vehicle.model) and the chat-linked shape (vehicleModel); every field is optional.
 */
export function BookingDetailsSheet({
  booking,
  visible,
  onClose,
}: {
  booking: Booking | null;
  visible: boolean;
  onClose: () => void;
}) {
  if (!booking) return null;

  const traveler = booking.traveler || {};
  const name = traveler.fullName || traveler.name || booking.travelerName || 'Traveller';
  const vehicle = booking.vehicleModel || booking.vehicle?.model;
  const status = (booking.status ?? 'pending').toLowerCase();
  const start = booking.startPoint || booking.pickupLocation;
  const end = booking.endPoint || booking.dropoffLocation;
  const hasFlight = booking.flightNumber || booking.arrivalTime || booking.departureTime;
  const dates = formatDateRange(booking.startDate, booking.endDate);
  const chip = statusChip(status);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[90%] rounded-t-[24px] bg-canvas px-[18px] pb-8 pt-4">
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="font-xheavy text-[17px] text-ink">Booking details</Text>
              {vehicle ? (
                <Text className="font-med text-[12.5px] text-muted-soft" numberOfLines={1}>
                  {vehicle}
                </Text>
              ) : null}
            </View>
            <View className="flex-row items-center gap-2">
              <View className={`rounded-md px-2 py-1 ${chip.bg}`}>
                <Text className={`font-xheavy text-[10.5px] uppercase ${chip.text}`}>{status}</Text>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                className="h-9 w-9 items-center justify-center rounded-xl bg-hairline"
              >
                <X size={16} color={colors.ink} strokeWidth={2} />
              </Pressable>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Section title="Traveller">
              <Row icon={User2} label="Name" value={name} />
              {traveler.email ? (
                <Row icon={Mail} label="Email" value={traveler.email} onPress={() => Linking.openURL(`mailto:${traveler.email}`)} />
              ) : null}
              {traveler.phoneNumber ? (
                <Row icon={Phone} label="Phone" value={traveler.phoneNumber} onPress={() => Linking.openURL(`tel:${traveler.phoneNumber}`)} />
              ) : null}
            </Section>

            <Section title="Trip">
              <Row icon={Calendar} label="Dates" value={dates || '—'} />
              {booking.totalDays ? (
                <Row icon={Calendar} label="Days" value={`${booking.totalDays} day${booking.totalDays === 1 ? '' : 's'}`} />
              ) : null}
              {vehicle ? <Row icon={Car} label="Vehicle" value={vehicle} /> : null}
            </Section>

            {start || end ? (
              <Section title="Pick-up & drop-off">
                {start ? <Row icon={MapPin} label="Start point" value={start} /> : null}
                {end ? <Row icon={MapPin} label="Drop-off point" value={end} /> : null}
              </Section>
            ) : null}

            {hasFlight ? (
              <Section title="Flight">
                {booking.flightNumber ? <Row icon={Plane} label="Flight number" value={booking.flightNumber} /> : null}
                {booking.arrivalTime ? <Row icon={Plane} label="Arrival time" value={booking.arrivalTime} /> : null}
                {booking.departureTime ? <Row icon={Plane} label="Departure time" value={booking.departureTime} /> : null}
              </Section>
            ) : null}

            {booking.specialRequests ? (
              <Section title="Notes & extras">
                <Text className="font-med text-[13px] leading-5 text-ink-soft">{booking.specialRequests}</Text>
              </Section>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-3">
      <Text className="mb-1.5 font-heavy text-[11px] uppercase tracking-wide text-muted-soft">{title}</Text>
      <View className="gap-2.5 rounded-2xl border border-line bg-white p-3.5">{children}</View>
    </View>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  onPress,
}: {
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const content = (
    <View className="flex-row items-start gap-2.5">
      <View style={{ marginTop: 2 }}>
        <Icon size={16} color={colors.mutedSoft} strokeWidth={1.8} />
      </View>
      <View className="flex-1">
        <Text className="font-med text-[11px] text-muted-soft">{label}</Text>
        <Text className={`font-heavy text-[13.5px] ${onPress ? 'text-brand-dark underline' : 'text-ink'}`}>
          {value}
        </Text>
      </View>
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}
