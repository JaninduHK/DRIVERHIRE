import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Star, Check } from 'lucide-react-native';
import { Screen } from '../../../components/Screen';
import { AppHeader } from '../../../components/AppHeader';
import { BodySheet } from '../../../components/BodySheet';
import { Card } from '../../../components/Card';
import { StatTile } from '../../../components/StatTile';
import { Avatar } from '../../../components/Avatar';
import { Button } from '../../../components/Button';
import { Toggle } from '../../../components/Toggle';
import { Badge } from '../../../components/Badge';
import { Loading, EmptyState } from '../../../components/states';
import { useAuth } from '../../../auth/AuthContext';
import { useOverview, useEarningsSummary, useBookings, useBriefs } from '../../../hooks/queries';
import { formatMoney } from '../../../lib/format';
import { colors } from '../../../theme/colors';
import type { Brief } from '../../../types';

const isUpcoming = (status?: string) =>
  ['confirmed', 'accepted', 'upcoming', 'paid'].includes((status ?? '').toLowerCase());

export default function Overview() {
  const router = useRouter();
  const { user } = useAuth();
  const [available, setAvailable] = useState(true);

  const overview = useOverview();
  const earnings = useEarningsSummary();
  const bookings = useBookings();
  const briefs = useBriefs();

  const firstName = (overview.data?.profile?.name ?? user?.name ?? 'there').split(' ')[0];
  const rating = overview.data?.activity?.rating || 0;
  const upcoming = (bookings.data ?? []).filter((b) => isUpcoming(b.status)).length;
  const openBriefs = briefs.data ?? [];

  const refreshing =
    overview.isRefetching || earnings.isRefetching || bookings.isRefetching || briefs.isRefetching;
  const onRefresh = () => {
    overview.refetch();
    earnings.refetch();
    bookings.refetch();
    briefs.refetch();
  };

  return (
    <Screen>
      <AppHeader eyebrow="DRIVER HOME" title={`Welcome back, ${firstName}`} showBell hasNotifications={openBriefs.length > 0}>
        <View className="mt-2 flex-row">
          <View className="flex-row items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-[5px]">
            <Check size={12} color="#fff" strokeWidth={3} />
            <Text className="font-heavy text-[12px] text-white">Approved driver</Text>
          </View>
        </View>
      </AppHeader>

      <BodySheet onRefresh={onRefresh} refreshing={refreshing} bottomInset={24}>
        {/* Availability */}
        <Card className="flex-row items-center gap-3 px-4 py-3.5">
          <View className="h-2.5 w-2.5 rounded-full bg-brand" />
          <View className="flex-1">
            <Text className="font-xheavy text-[14.5px] text-ink">
              {available ? 'Available today' : 'Not available'}
            </Text>
            <Text className="font-med text-[12px] text-muted-soft">
              {available ? `Visible to travellers near ${user?.address ?? 'you'}` : 'Turn on to appear in search'}
            </Text>
          </View>
          <Toggle value={available} onChange={setAvailable} />
        </Card>

        {/* Stats */}
        <View className="mt-3 flex-row gap-2.5">
          <StatTile value={formatMoney(earnings.data?.totals?.driverEarnings)} label="This month" />
          <StatTile value={upcoming} label="Upcoming" />
          <StatTile
            value={
              <View className="flex-row items-center gap-0.5">
                <Text className="font-xheavy text-[22px] text-ink">{rating ? rating.toFixed(1) : '—'}</Text>
                <Star size={13} color={colors.star} fill={colors.star} />
              </View>
            }
            label="Rating"
          />
        </View>

        {/* New quote requests */}
        <View className="mb-2.5 mt-5 flex-row items-center justify-between px-0.5">
          <Text className="font-heavy text-[16px] text-ink">New quote requests</Text>
          {openBriefs.length > 0 ? <Badge count={openBriefs.length} /> : null}
        </View>

        {briefs.isLoading ? (
          <Loading />
        ) : openBriefs.length === 0 ? (
          <Card className="p-5">
            <EmptyState
              title="No new requests yet"
              subtitle="When travellers post a trip that fits your vehicle, it shows up here."
            />
          </Card>
        ) : (
          <View className="gap-3">
            {openBriefs.slice(0, 4).map((brief) => (
              <RequestCard key={brief.id} brief={brief} onPress={() => router.push(`/(app)/request/${brief.id}`)} />
            ))}
          </View>
        )}
      </BodySheet>
    </Screen>
  );
}

function RequestCard({ brief, onPress }: { brief: Brief; onPress: () => void }) {
  const travelerName =
    (brief.traveler && typeof brief.traveler === 'object' ? brief.traveler.name : undefined) || 'Traveller';
  const route =
    [brief.startLocation, brief.endLocation].filter(Boolean).join(' → ') || brief.route || 'Trip request';
  const adults = brief.adults ?? 0;
  const children = brief.children ?? 0;
  const guestsLabel =
    adults || children
      ? `${adults} adult${adults === 1 ? '' : 's'}${children > 0 ? ` + ${children} child${children === 1 ? '' : 'ren'}` : ''}`
      : null;
  const meta = [
    guestsLabel,
    brief.country || null,
    brief.offersCount ? `${brief.offersCount} offer${brief.offersCount === 1 ? '' : 's'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const message = brief.message || brief.description;
  return (
    <Card className="border-l-4 border-brand p-4">
      <Pressable onPress={onPress}>
        <View className="flex-row items-center gap-3">
          <Avatar name={travelerName} size={42} rounded={12} />
          <View className="min-w-0 flex-1">
            <Text className="font-heavy text-[15px] text-ink" numberOfLines={1}>
              {travelerName}
            </Text>
            <Text className="mt-0.5 font-med text-[12px] text-muted-soft" numberOfLines={1}>
              {route}
            </Text>
          </View>
        </View>
        {meta ? (
          <Text className="mt-2.5 font-semi text-[12.5px] text-muted" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        {message ? (
          <Text className="mt-1.5 font-med text-[13px] leading-5 text-muted" numberOfLines={2}>
            {message}
          </Text>
        ) : null}
      </Pressable>
      <Button title="Send offer" variant="primary" className="mt-3.5" onPress={onPress} />
    </Card>
  );
}
