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
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Send, FileText, X } from 'lucide-react-native';
import { Avatar } from '../../../components/Avatar';
import { IconButton } from '../../../components/IconButton';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { Loading } from '../../../components/states';
import { useMessages, useConversations, useVehicles, qk } from '../../../hooks/queries';
import { sendMessage, sendOffer } from '../../../api/chat';
import { useAuth } from '../../../auth/AuthContext';
import { formatMoney, formatRate } from '../../../lib/format';
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
  const { data: messages, isLoading } = useMessages(conversationId);

  const [text, setText] = useState('');
  const [offerOpen, setOfferOpen] = useState(false);

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
        vehicles={(vehicles ?? []).filter((v) => (v.status ?? 'approved').toLowerCase() === 'approved')}
        conversationId={conversationId}
        onSent={() => {
          setOfferOpen(false);
          invalidate();
        }}
      />
    </View>
  );
}

function Bubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  if (message.type === 'offer' && message.offer) {
    const o = message.offer;
    return (
      <View className="max-w-[88%] self-end rounded-2xl border-[1.5px] border-[#cdeede] bg-white p-3.5">
        <View className="mb-2 flex-row items-center justify-between">
          <View className="rounded-md bg-brand-tint px-2 py-0.5">
            <Text className="font-xheavy text-[10.5px] text-brand-dark">OFFER SENT</Text>
          </View>
          <Text className="font-heavy text-[18px] text-ink">{formatMoney(o.totalPrice)}</Text>
        </View>
        {o.vehicleLabel || o.vehicle?.model ? (
          <Text className="font-heavy text-[13px] text-ink">{o.vehicleLabel || o.vehicle?.model}</Text>
        ) : null}
        {o.includedKm ? (
          <Text className="mt-0.5 font-med text-[12px] text-muted-soft">
            {o.includedKm} km included{o.extraKmRate ? `, ${formatRate(o.extraKmRate)} per extra km` : ''}
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

function OfferModal({
  visible,
  onClose,
  vehicles,
  conversationId,
  onSent,
}: {
  visible: boolean;
  onClose: () => void;
  vehicles: { id: string; model: string; seats?: number }[];
  conversationId: string;
  onSent: () => void;
}) {
  const [price, setPrice] = useState('');
  const [includedKm, setIncludedKm] = useState('300');
  const [extraKm, setExtraKm] = useState('0.30');
  const [note, setNote] = useState('');
  const vehicleId = vehicles[0]?.id;

  const submit = useMutation({
    mutationFn: () =>
      sendOffer(conversationId, {
        totalPrice: Number(price) || 0,
        includedKm: Number(includedKm) || undefined,
        extraKmRate: Number(extraKm) || undefined,
        vehicleId,
        note: note.trim() || undefined,
      }),
    onSuccess: onSent,
    onError: (err) => Alert.alert('Could not send offer', err instanceof Error ? err.message : 'Try again.'),
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="rounded-t-[24px] bg-canvas px-[18px] pb-8 pt-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="font-xheavy text-[17px] text-ink">Send a formal offer</Text>
            <Pressable onPress={onClose} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-xl bg-hairline">
              <X size={16} color={colors.ink} strokeWidth={2} />
            </Pressable>
          </View>
          <View className="flex-row gap-2.5">
            <TextField className="flex-1" label="Total price (USD)" value={price} onChangeText={setPrice} placeholder="420" keyboardType="number-pad" />
            <TextField className="flex-1" label="Included km" value={includedKm} onChangeText={setIncludedKm} placeholder="300" keyboardType="number-pad" />
          </View>
          <TextField className="mt-3" label="Extra km rate (USD)" value={extraKm} onChangeText={setExtraKm} placeholder="0.30" keyboardType="decimal-pad" />
          <TextField className="mt-3" label="Note" value={note} onChangeText={setNote} placeholder="What is included in this price" multiline />
          <Button
            title={price ? `Send offer, ${formatMoney(Number(price))}` : 'Send offer'}
            variant="cta"
            className="mt-4"
            loading={submit.isPending}
            disabled={!(Number(price) > 0)}
            onPress={() => submit.mutate()}
          />
        </View>
      </View>
    </Modal>
  );
}
