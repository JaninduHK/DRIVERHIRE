import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import { Screen } from '../../../components/Screen';
import { GradientHeader } from '../../../components/GradientHeader';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { Chip } from '../../../components/Chip';
import { IconButton } from '../../../components/IconButton';
import { useBriefs, useVehicles, qk } from '../../../hooks/queries';
import { respondToBrief } from '../../../api/briefs';
import { formatDateRange, formatMoney } from '../../../lib/format';

export default function RequestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: briefs } = useBriefs();
  const { data: vehicles } = useVehicles();
  const brief = useMemo(() => (briefs ?? []).find((b) => b.id === id), [briefs, id]);

  const activeVehicles = (vehicles ?? []).filter((v) => (v.status ?? 'approved').toLowerCase() === 'approved');
  const [vehicleId, setVehicleId] = useState<string | undefined>(activeVehicles[0]?.id);
  const [price, setPrice] = useState(brief?.budget ? String(brief.budget) : '');
  const [includedKm, setIncludedKm] = useState('300');
  const [note, setNote] = useState('');

  const respond = useMutation({
    mutationFn: () =>
      respondToBrief(String(id), {
        totalPrice: Number(price) || 0,
        note: note.trim() || undefined,
        message: note.trim() || undefined,
        vehicleId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.briefs });
      Alert.alert('Offer sent', 'The traveller has been notified of your offer.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    },
    onError: (err) => Alert.alert('Could not send offer', err instanceof Error ? err.message : 'Try again.'),
  });

  const canSend = Number(price) > 0 && !respond.isPending;
  const title = brief?.title || brief?.route || 'Quote request';
  const subtitle = [formatDateRange(brief?.startDate, brief?.endDate), brief?.guests ? `${brief.guests} guests` : null]
    .filter(Boolean)
    .join(', ');

  return (
    <Screen edges={[]}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <GradientHeader
          eyebrow="QUOTE REQUEST"
          title={title}
          subtitle={subtitle}
          left={
            <IconButton onPress={() => router.back()}>
              <ChevronLeft size={18} color="#fff" strokeWidth={2} />
            </IconButton>
          }
        />

        <View className="-mt-10 flex-1 overflow-hidden rounded-t-[28px] bg-canvas">
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, paddingBottom: 24 }}>
            {/* Trip details */}
            <Card className="p-4">
              <Text className="font-heavy text-[14px] text-ink">Trip details</Text>
              <View className="mt-3 gap-2.5">
                <DetailRow label="Route" value={brief?.route || title} />
                <DetailRow label="Dates" value={formatDateRange(brief?.startDate, brief?.endDate) || '—'} />
                <DetailRow label="Guests" value={brief?.guests ? `${brief.guests}` : '—'} />
                <DetailRow label="Budget hint" value={brief?.budget ? `About ${formatMoney(brief.budget)}` : brief?.budgetHint || '—'} />
              </View>
              {brief?.description ? (
                <Text className="mt-3 font-med text-[13px] leading-5 text-muted">{brief.description}</Text>
              ) : null}
            </Card>

            {/* Your offer */}
            <Card className="mt-3 p-4">
              <Text className="font-heavy text-[14px] text-ink">Your offer</Text>
              <View className="mt-3 flex-row gap-2.5">
                <TextField className="flex-1" label="Total price (USD)" value={price} onChangeText={setPrice} placeholder="420" keyboardType="number-pad" />
                <TextField className="flex-1" label="Included km" value={includedKm} onChangeText={setIncludedKm} placeholder="300" keyboardType="number-pad" />
              </View>

              {activeVehicles.length > 0 ? (
                <>
                  <Text className="mb-1.5 mt-3.5 font-heavy text-[12.5px] text-ink-soft">Vehicle</Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    {activeVehicles.map((v) => (
                      <Chip
                        key={v.id}
                        label={`${v.model}${v.seats ? `, ${v.seats} seats` : ''}`}
                        selected={vehicleId === v.id}
                        onPress={() => setVehicleId(v.id)}
                      />
                    ))}
                  </View>
                </>
              ) : null}

              <TextField
                className="mt-3.5"
                label="Note to traveller"
                value={note}
                onChangeText={setNote}
                placeholder="Happy to add stops along the way at no extra cost."
                multiline
              />
            </Card>
          </ScrollView>

          {/* Sticky footer */}
          <View className="flex-row items-center gap-2.5 border-t border-[#eef1f0] bg-white px-4 pb-6 pt-3">
            <Button title="Decline" variant="secondary" onPress={() => router.back()} />
            <Button
              title={price ? `Send offer, ${formatMoney(Number(price))}` : 'Send offer'}
              variant="primary"
              className="flex-1 py-3.5"
              loading={respond.isPending}
              disabled={!canSend}
              onPress={() => respond.mutate()}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between">
      <Text className="font-semi text-[13.5px] text-muted-soft">{label}</Text>
      <Text className="font-heavy text-[13.5px] text-ink">{value}</Text>
    </View>
  );
}
