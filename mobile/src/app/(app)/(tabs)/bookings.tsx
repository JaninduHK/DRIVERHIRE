import { useMemo, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Calendar } from 'lucide-react-native';
import { Screen } from '../../../components/Screen';
import { AppHeader } from '../../../components/AppHeader';
import { BodySheet } from '../../../components/BodySheet';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Avatar } from '../../../components/Avatar';
import { SegmentedTabs } from '../../../components/SegmentedTabs';
import { Loading, EmptyState } from '../../../components/states';
import { useBookings, qk } from '../../../hooks/queries';
import { respondToBooking } from '../../../api/bookings';
import { formatMoney, formatDateRange } from '../../../lib/format';
import { colors } from '../../../theme/colors';
import type { Booking } from '../../../types';

const isCompleted = (b: Booking) => {
  const s = (b.status ?? '').toLowerCase();
  if (['completed', 'cancelled', 'declined', 'rejected'].includes(s)) return true;
  if (b.endDate && new Date(b.endDate).getTime() < Date.now()) return true;
  return false;
};

const isPending = (b: Booking) => ['pending', 'requested'].includes((b.status ?? '').toLowerCase());

const statusLabel = (b: Booking): { text: string; tone: 'brand' | 'info' | 'muted' } => {
  const s = (b.status ?? '').toLowerCase();
  if (isPending(b)) return { text: 'ACTION NEEDED', tone: 'info' };
  if (['completed'].includes(s)) return { text: 'COMPLETED', tone: 'muted' };
  if (['cancelled', 'declined', 'rejected'].includes(s)) return { text: s.toUpperCase(), tone: 'muted' };
  if (b.startDate) {
    const days = Math.ceil((new Date(b.startDate).getTime() - Date.now()) / 86400000);
    if (days > 0 && days <= 7) return { text: `STARTS IN ${days} DAY${days > 1 ? 'S' : ''}`, tone: 'info' };
  }
  return { text: 'CONFIRMED', tone: 'brand' };
};

export default function Bookings() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'upcoming' | 'completed'>('upcoming');
  const { data, isLoading, isRefetching, refetch } = useBookings();

  const respond = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => respondToBooking(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.bookings });
      queryClient.invalidateQueries({ queryKey: qk.overview });
    },
    onError: (err) => Alert.alert('Could not update booking', err instanceof Error ? err.message : 'Try again.'),
  });

  const { upcoming, completed } = useMemo(() => {
    const all = data ?? [];
    return {
      upcoming: all.filter((b) => !isCompleted(b)),
      completed: all.filter(isCompleted),
    };
  }, [data]);

  const list = tab === 'upcoming' ? upcoming : completed;

  return (
    <Screen>
      <AppHeader eyebrow="TRIPS" title="My Bookings" />
      <BodySheet onRefresh={refetch} refreshing={isRefetching}>
        <SegmentedTabs
          className="mb-3.5"
          value={tab}
          onChange={(k) => setTab(k as 'upcoming' | 'completed')}
          options={[
            { key: 'upcoming', label: `Upcoming ${upcoming.length || ''}`.trim() },
            { key: 'completed', label: 'Completed' },
          ]}
        />

        {isLoading ? (
          <Loading />
        ) : list.length === 0 ? (
          <Card className="p-5">
            <EmptyState
              title={tab === 'upcoming' ? 'No upcoming trips' : 'No completed trips yet'}
              subtitle={tab === 'upcoming' ? 'Accepted bookings will appear here.' : 'Finished trips will be listed here.'}
            />
          </Card>
        ) : (
          <View className="gap-3">
            {list.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                busy={respond.isPending}
                onAccept={() => respond.mutate({ id: b.id, status: 'accepted' })}
                onReject={() =>
                  Alert.alert('Decline booking?', 'The traveller will be notified.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Decline', style: 'destructive', onPress: () => respond.mutate({ id: b.id, status: 'rejected' }) },
                  ])
                }
                onMessage={() => router.push('/(app)/(tabs)/messages')}
              />
            ))}
          </View>
        )}
      </BodySheet>
    </Screen>
  );
}

function BookingCard({
  booking,
  busy,
  onAccept,
  onReject,
  onMessage,
}: {
  booking: Booking;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
  onMessage: () => void;
}) {
  const label = statusLabel(booking);
  const travelerName = booking.traveler?.name || booking.travelerName || 'Traveller';
  const vehicle = booking.vehicle?.model || booking.vehicleModel || 'Vehicle';
  const route =
    booking.route ||
    [booking.pickupLocation, booking.dropoffLocation].filter(Boolean).join(' to ') ||
    'Trip';
  const toneBorder =
    label.tone === 'brand' ? 'border-brand' : label.tone === 'info' ? 'border-[#d6e9fb]' : 'border-line';
  const toneChip =
    label.tone === 'brand'
      ? 'bg-brand-tint text-brand-dark'
      : label.tone === 'info'
        ? 'bg-[#e5f0fb] text-[#1d6fb8]'
        : 'bg-[#eef1f0] text-muted';

  return (
    <Card className={`border-l-4 p-[15px] ${toneBorder}`}>
      <View className="mb-2.5 flex-row items-center justify-between">
        <View className={`rounded-lg px-2.5 py-1 ${toneChip.split(' ')[0]}`}>
          <Text className={`font-xheavy text-[11px] ${toneChip.split(' ')[1]}`}>{label.text}</Text>
        </View>
        <Text className="font-heavy text-[16px] text-ink">{formatMoney(booking.totalPrice)}</Text>
      </View>

      <View className="flex-row items-center gap-3">
        <Avatar name={travelerName} size={40} rounded={11} />
        <View className="flex-1">
          <Text className="font-heavy text-[14.5px] text-ink">{travelerName}</Text>
          <Text className="font-med text-[12px] text-muted-soft">
            {booking.guests ? `${booking.guests} guests, ` : ''}
            {vehicle}
          </Text>
        </View>
      </View>

      <View className="mt-3 gap-1.5 rounded-xl bg-canvas px-3 py-3">
        <View className="flex-row items-center gap-2">
          <MapPin size={14} color={colors.brand} strokeWidth={1.8} />
          <Text className="font-heavy text-[13px] text-ink">{route}</Text>
        </View>
        {formatDateRange(booking.startDate, booking.endDate) ? (
          <View className="flex-row items-center gap-2">
            <Calendar size={14} color={colors.mutedSoft} strokeWidth={1.6} />
            <Text className="font-med text-[13px] text-muted">
              {formatDateRange(booking.startDate, booking.endDate)}
            </Text>
          </View>
        ) : null}
      </View>

      {isPending(booking) ? (
        <View className="mt-3 flex-row gap-2">
          <Button title="Decline" variant="secondary" onPress={onReject} />
          <Button title="Accept booking" variant="primary" className="flex-1" loading={busy} onPress={onAccept} />
        </View>
      ) : (
        <View className="mt-3">
          <Button title="Message traveller" variant="primary" onPress={onMessage} />
        </View>
      )}
    </Card>
  );
}
