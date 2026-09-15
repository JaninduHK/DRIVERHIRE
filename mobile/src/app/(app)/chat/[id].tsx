import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Send, FileText, X, CalendarCheck, ChevronRight } from 'lucide-react-native';
import { Avatar } from '../../../components/Avatar';
import { IconButton } from '../../../components/IconButton';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { Chip } from '../../../components/Chip';
import { Loading } from '../../../components/states';
import { BookingDetailsSheet } from '../../../components/BookingDetailsSheet';
import { DatePickerField } from '../../../components/DatePickerField';
import { useMessages, useConversations, useVehicles, qk } from '../../../hooks/queries';
import { sendMessage, sendOffer } from '../../../api/chat';
import { useAuth } from '../../../auth/AuthContext';
import { formatMoney, formatRate, formatDateRange } from '../../../lib/format';
import { colors, headerGradient } from '../../../theme/colors';
import type { ChatMessage } from '../../../types';

const isMine = (m: ChatMessage, userId?: string) =>
  m.isMine ?? (m.senderRole === 'driver' || (userId != null && m.senderId === userId));

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = String(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const { data: conversations } = useConversations();
  const { data: vehicles } = useVehicles();
  const conversation = useMemo(() => (conversations ?? []).find((c) => c.id === conversationId), [conversations, conversationId]);
  const { data: messagesData, isLoading } = useMessages(conversationId);
  const messages = messagesData?.messages;
  const booking = messagesData?.booking ?? null;

  const [text, setText] = useState('');
  const [offerOpen, setOfferOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: qk.messages(conversationId) });
    queryClient.invalidateQueries({ queryKey: qk.conversations });
  };

  const send = useMutation({
    mutationFn: (body: string) => sendMessage(conversationId, body),
    onSuccess: () => {
      setText('');
      invalidate();
    },
    onError: (err) => Alert.alert('Not sent', err instanceof Error ? err.message : 'Try again.'),
  });

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    return () => clearTimeout(t);
  }, [messages?.length]);

  const traveler = conversation?.participantName || conversation?.traveler?.name || 'Traveller';

  return (
    <View className="flex-1 bg-canvas">
      <StatusBar style="light" />
      <LinearGradient
        colors={headerGradient as unknown as [string, string, string]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 18 }}
      >
        <View className="flex-row items-center gap-3 px-4">
          <IconButton onPress={() => router.back()}>
            <ChevronLeft size={18} color="#fff" strokeWidth={2} />
          </IconButton>
          <Avatar name={traveler} uri={conversation?.traveler?.profilePhoto} size={40} rounded={12} />
          <View className="flex-1">
            <Text className="font-xheavy text-[16px] text-white" numberOfLines={1}>
              {traveler}
            </Text>
            {conversation?.subtitle ? (
              <Text className="font-med text-[12px] text-white/80" numberOfLines={1}>
                {conversation.subtitle}
              </Text>
            ) : null}
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 8}
      >
        {booking ? (
          <Pressable
            onPress={() => setBookingOpen(true)}
            className="mx-4 mt-3 flex-row items-center gap-2.5 rounded-2xl border-[1.5px] border-[#cdeede] bg-brand-tint px-3.5 py-2.5 active:opacity-80"
          >
            <CalendarCheck size={18} color={colors.brand} strokeWidth={2} />
            <View className="flex-1">
              <Text className="font-xheavy text-[12.5px] text-ink">
                {booking.status === 'confirmed'
                  ? 'Confirmed booking with this traveller'
                  : 'Booking request from this traveller'}
              </Text>
              <Text className="font-med text-[11.5px] text-muted-soft">Tap to view trip details</Text>
            </View>
            <ChevronRight size={16} color={colors.mutedSoft} strokeWidth={2} />
          </Pressable>
        ) : null}
        {isLoading ? (
          <Loading />
        ) : (
          <ScrollView
            ref={scrollRef}
            className="flex-1"
            contentContainerStyle={{ padding: 18, gap: 10 }}
            showsVerticalScrollIndicator={false}
          >
            {(messages ?? []).map((m) => (
              <Bubble key={m.id} message={m} mine={isMine(m, user?.id)} />
            ))}
          </ScrollView>
        )}

        {/* Composer */}
        <View
          className="flex-row items-center gap-2 border-t border-[#eef1f0] bg-white px-4 pt-3"
          style={{ paddingBottom: (insets.bottom || 12) + 4 }}
        >
          <Pressable
            onPress={() => setOfferOpen(true)}
            className="h-10 w-10 items-center justify-center rounded-[11px] border-[1.5px] border-line bg-white active:bg-hairline"
          >
            <FileText size={17} color={colors.brand} strokeWidth={1.8} />
          </Pressable>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message"
            placeholderTextColor={colors.placeholder}
            className="h-10 flex-1 rounded-[11px] border-[1.5px] border-line px-3 font-med text-[13px] text-ink"
          />
          <Pressable
            onPress={() => text.trim() && send.mutate(text.trim())}
            disabled={!text.trim() || send.isPending}
            className={`h-10 w-10 items-center justify-center rounded-[11px] bg-brand ${!text.trim() ? 'opacity-50' : ''}`}
          >
            <Send size={17} color="#fff" fill="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <OfferModal
        visible={offerOpen}
        onClose={() => setOfferOpen(false)}
        vehicles={(vehicles ?? []).filter((v) => (v.status ?? '').toLowerCase() === 'approved')}
        conversationId={conversationId}
        onSent={() => {
          setOfferOpen(false);
          invalidate();
        }}
      />

      <BookingDetailsSheet booking={booking} visible={bookingOpen} onClose={() => setBookingOpen(false)} />
    </View>
  );
}

function Bubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  if (message.type === 'brief' && message.briefRequest) {
    return <BriefBubble message={message} />;
  }
  if (message.type === 'offer' && message.offer) {
    const o = message.offer;
    const kmIncluded = o.totalKms ?? o.includedKm;
    const extraKmRate = o.pricePerExtraKm ?? o.extraKmRate;
    const dateRange = formatDateRange(o.startDate, o.endDate);
    return (
      <View className="max-w-[88%] self-end rounded-2xl border-[1.5px] border-[#cdeede] bg-white p-3.5">
        <View className="mb-2 flex-row items-center justify-between">
          <View className="rounded-md bg-brand-tint px-2 py-0.5">
            <Text className="font-xheavy text-[10.5px] text-brand-dark">OFFER SENT</Text>
          </View>
          <Text className="font-heavy text-[18px] text-ink">{formatMoney(o.totalPrice)}</Text>
        </View>
        <OfferVehicleImages images={o.vehicle?.images} />
        {o.vehicleLabel || o.vehicle?.model || dateRange ? (
          <Text className="font-heavy text-[13px] text-ink">
            {[o.vehicleLabel || o.vehicle?.model, dateRange].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
        {kmIncluded ? (
          <Text className="mt-0.5 font-med text-[12px] text-muted-soft">
            {kmIncluded} km included{extraKmRate != null ? ` · ${formatRate(extraKmRate)} / extra km` : ''}
          </Text>
        ) : null}
        {o.note ? <Text className="mt-1.5 font-med text-[12px] leading-4 text-muted-soft">{o.note}</Text> : null}
      </View>
    );
  }

  return (
    <View
      className={`max-w-[74%] px-3.5 py-2.5 ${
        mine ? 'self-end rounded-2xl rounded-br-[4px] bg-brand' : 'self-start rounded-2xl rounded-bl-[4px] bg-white'
      }`}
      style={!mine ? { shadowColor: '#0f1f2d', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } } : undefined}
    >
      <Text className={`font-med text-[13.5px] ${mine ? 'text-white' : 'text-ink'}`}>{message.body}</Text>
    </View>
  );
}

// The tour brief shown as the traveller's message above the driver's offer, so
// both sides see the original request. Itinerary text is clamped to a few lines
// with a Read more / Read less toggle. Contact details are redacted server-side.
function BriefBubble({ message }: { message: ChatMessage }) {
  const [expanded, setExpanded] = useState(false);
  const b = message.briefRequest ?? {};
  const route = [b.startLocation, b.endLocation].filter(Boolean).join(' → ');
  const dates = formatDateRange(b.startDate, b.endDate);
  const adults = b.adults ?? 0;
  const children = b.children ?? 0;
  const guests =
    adults || children
      ? `${adults} adult${adults === 1 ? '' : 's'}${children > 0 ? `, ${children} child${children === 1 ? '' : 'ren'}` : ''}`
      : '';
  const meta = [dates, guests, b.country].filter(Boolean).join(' · ');
  const text = (b.message ?? '').trim();
  const isLong = text.length > 160 || text.split('\n').length > 3;

  return (
    <View className="max-w-[88%] self-start rounded-2xl border-[1.5px] border-[#e3e8ec] bg-[#f7f9fa] p-3.5">
      <View className="self-start rounded-md bg-[#eef2f5] px-2 py-0.5">
        <Text className="font-xheavy text-[10.5px] uppercase text-muted-soft">Quote request</Text>
      </View>
      {route ? <Text className="mt-2 font-heavy text-[13px] text-ink">{route}</Text> : null}
      {meta ? <Text className="mt-0.5 font-med text-[12px] text-muted-soft">{meta}</Text> : null}
      {text ? (
        <>
          <Text
            className="mt-2 font-med text-[12.5px] leading-5 text-muted-soft"
            numberOfLines={!expanded && isLong ? 3 : undefined}
          >
            {text}
          </Text>
          {isLong ? (
            <Pressable onPress={() => setExpanded((value) => !value)} hitSlop={6}>
              <Text className="mt-1 font-heavy text-[12px] text-brand-dark">
                {expanded ? 'Read less' : 'Read more'}
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

// Vehicle photos inside an offer bubble — a horizontal row of small squares,
// matching the web offer card. Renders nothing when the vehicle has no photos,
// so older offers keep their original layout.
function OfferVehicleImages({ images }: { images?: (string | { url?: string })[] }) {
  const photos = (images ?? [])
    .map((img) => (typeof img === 'string' ? img : img?.url))
    .filter((uri): uri is string => Boolean(uri));
  if (photos.length === 0) return null;
  return (
    // An explicit height is required: a horizontal ScrollView nested in the
    // vertical message list otherwise expands to fill all available height on
    // iOS, blowing up the bubble and swallowing vertical scroll gestures.
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mb-2"
      style={{ height: 56, flexGrow: 0, flexShrink: 0 }}
      contentContainerStyle={{ gap: 6 }}
    >
      {photos.map((uri, i) => (
        <Image
          key={`${uri}-${i}`}
          source={{ uri }}
          contentFit="cover"
          style={{ width: 56, height: 56, borderRadius: 10, borderWidth: 1, borderColor: '#e8edf0' }}
        />
      ))}
    </ScrollView>
  );
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function OfferModal({
  visible,
  onClose,
  vehicles,
  conversationId,
  onSent,
}: {
  visible: boolean;
  onClose: () => void;
  // Only approved vehicles are passed in.
  vehicles: { id: string; model: string; seats?: number }[];
  conversationId: string;
  onSent: () => void;
}) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [vehicleId, setVehicleId] = useState<string | undefined>(vehicles[0]?.id);
  const [totalPrice, setTotalPrice] = useState('');
  const [totalKms, setTotalKms] = useState('300');
  const [extraKm, setExtraKm] = useState('0.30');
  const [note, setNote] = useState('');

  // Keep a valid (approved) vehicle selected once the list loads.
  useEffect(() => {
    if (!vehicleId && vehicles.length) setVehicleId(vehicles[0].id);
  }, [vehicles, vehicleId]);

  const submit = useMutation({
    mutationFn: () =>
      sendOffer(conversationId, {
        startDate,
        endDate,
        vehicleId: String(vehicleId),
        totalPrice: Number(totalPrice),
        totalKms: Number(totalKms),
        pricePerExtraKm: Number(extraKm),
        note: note.trim() || undefined,
      }),
    onSuccess: onSent,
    onError: (err) => Alert.alert('Could not send offer', err instanceof Error ? err.message : 'Try again.'),
  });

  const datesOk = ISO_DATE.test(startDate) && ISO_DATE.test(endDate) && endDate >= startDate;
  const canSend =
    datesOk &&
    Boolean(vehicleId) &&
    Number(totalPrice) > 0 &&
    Number(totalKms) > 0 &&
    Number(extraKm) >= 0 &&
    Number(extraKm) <= 1 &&
    !submit.isPending;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1 justify-end bg-black/40"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="max-h-[88%] rounded-t-[24px] bg-canvas px-[18px] pb-8 pt-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="font-xheavy text-[17px] text-ink">Send an offer</Text>
            <Pressable onPress={onClose} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-xl bg-hairline">
              <X size={16} color={colors.ink} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Dates */}
            <View className="flex-row gap-2.5">
              <DatePickerField
                className="flex-1"
                label="Start date"
                value={startDate}
                onChange={setStartDate}
                minimumDate={new Date()}
              />
              <DatePickerField
                className="flex-1"
                label="End date"
                value={endDate}
                onChange={setEndDate}
                minimumDate={startDate ? new Date(`${startDate}T00:00:00`) : new Date()}
              />
            </View>

            {/* Vehicle — approved only */}
            {vehicles.length > 0 ? (
              <View className="mt-3">
                <Text className="mb-1.5 font-heavy text-[12.5px] text-ink-soft">Vehicle</Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {vehicles.map((v) => (
                    <Chip
                      key={v.id}
                      label={`${v.model}${v.seats ? `, ${v.seats} seats` : ''}`}
                      selected={vehicleId === v.id}
                      onPress={() => setVehicleId(v.id)}
                    />
                  ))}
                </View>
              </View>
            ) : (
              <Text className="mt-3 font-med text-[12.5px] text-danger">
                You need an approved vehicle to send an offer.
              </Text>
            )}

            {/* Pricing */}
            <View className="mt-3 flex-row gap-2.5">
              <TextField className="flex-1" label="Total price (USD)" value={totalPrice} onChangeText={setTotalPrice} placeholder="420" keyboardType="number-pad" />
              <TextField className="flex-1" label="Included kms" value={totalKms} onChangeText={setTotalKms} placeholder="300" keyboardType="number-pad" />
            </View>
            <TextField className="mt-3" label="Price per extra km (USD)" value={extraKm} onChangeText={setExtraKm} placeholder="0.30" keyboardType="decimal-pad" />
            <Text className={`mt-1 font-med text-[11px] ${Number(extraKm) > 1 ? 'text-danger' : 'text-muted-soft'}`}>
              In USD, between $0.00 and $1.00 per km.
            </Text>

            <TextField
              className="mt-3"
              label="Notes to traveller (optional)"
              value={note}
              onChangeText={setNote}
              placeholder="Share highlights, inclusions, or expectations."
              multiline
            />

            <Button
              title={totalPrice ? `Send offer, ${formatMoney(Number(totalPrice))}` : 'Send offer'}
              variant="cta"
              className="mt-4"
              loading={submit.isPending}
              disabled={!canSend}
              onPress={() => submit.mutate()}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
