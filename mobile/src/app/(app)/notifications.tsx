import { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, MessageSquare, FileText, Calendar } from 'lucide-react-native';
import { Screen } from '../../components/Screen';
import { GradientHeader } from '../../components/GradientHeader';
import { BodySheet } from '../../components/BodySheet';
import { Card } from '../../components/Card';
import { Divider } from '../../components/Divider';
import { IconButton } from '../../components/IconButton';
import { EmptyState, Loading } from '../../components/states';
import { useBriefs, useConversations, useBookings } from '../../hooks/queries';
import { relativeTime } from '../../lib/format';
import { colors } from '../../theme/colors';

type Item = {
  id: string;
  icon: typeof MessageSquare;
  title: string;
  body: string;
  time: string;
  fresh?: boolean;
};

export default function Notifications() {
  const router = useRouter();
  const briefs = useBriefs();
  const conversations = useConversations();
  const bookings = useBookings();

  const items = useMemo<Item[]>(() => {
    const list: Item[] = [];
    (briefs.data ?? []).slice(0, 5).forEach((b) =>
      list.push({
        id: `brief-${b.id}`,
        icon: FileText,
        title: 'New quote request',
        body: b.title || b.route || 'A traveller posted a new trip.',
        time: relativeTime(b.createdAt),
        fresh: true,
      })
    );
    (conversations.data ?? [])
      .filter((c) => (c.unreadCount ?? 0) > 0)
      .forEach((c) =>
        list.push({
          id: `msg-${c.id}`,
          icon: MessageSquare,
          title: `New message`,
          body: `${c.participantName || c.traveler?.name || 'A traveller'} sent you a message.`,
          time: relativeTime(c.updatedAt),
          fresh: true,
        })
      );
    (bookings.data ?? [])
      .filter((b) => ['pending', 'requested'].includes((b.status ?? '').toLowerCase()))
      .forEach((b) =>
        list.push({
          id: `book-${b.id}`,
          icon: Calendar,
          title: 'Booking request',
          body: `${b.traveler?.name || b.travelerName || 'A traveller'} wants to book your vehicle.`,
          time: relativeTime(b.createdAt),
          fresh: true,
        })
      );
    return list;
  }, [briefs.data, conversations.data, bookings.data]);

  const loading = briefs.isLoading || conversations.isLoading || bookings.isLoading;

  return (
    <Screen>
      <GradientHeader
        eyebrow="UPDATES"
        title="Notifications"
        left={
          <IconButton onPress={() => router.back()}>
            <ChevronLeft size={18} color="#fff" strokeWidth={2} />
          </IconButton>
        }
      />
      <BodySheet>
        {loading ? (
          <Loading />
        ) : items.length === 0 ? (
          <Card className="p-5">
            <EmptyState title="You're all caught up" subtitle="New requests, messages and payouts will show here." />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            {items.map((it, i) => {
              const Icon = it.icon;
              return (
                <View key={it.id}>
                  {i > 0 ? <Divider /> : null}
                  <View className={`flex-row items-start gap-3 p-3.5 ${it.fresh ? 'bg-[#f3fbf6]' : ''}`}>
                    <View className="h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-brand-tint">
                      <Icon size={17} color={colors.brand} strokeWidth={1.9} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-heavy text-[14px] text-ink">{it.title}</Text>
                      <Text className="font-med text-[12.5px] leading-5 text-muted">{it.body}</Text>
                      {it.time ? <Text className="mt-1 font-med text-[11.5px] text-muted-soft">{it.time}</Text> : null}
                    </View>
                  </View>
                </View>
              );
            })}
          </Card>
        )}
      </BodySheet>
    </Screen>
  );
}
