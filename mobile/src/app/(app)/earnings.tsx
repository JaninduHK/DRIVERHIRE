import { useMemo, useState } from 'react';
import { View, Text, Pressable, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, RefreshCw, Upload, BadgeCheck, ChevronDown, Check } from 'lucide-react-native';
import { Screen } from '../../components/Screen';
import { GradientHeader } from '../../components/GradientHeader';
import { BodySheet } from '../../components/BodySheet';
import { Card } from '../../components/Card';
import { Divider } from '../../components/Divider';
import { IconButton } from '../../components/IconButton';
import { Loading, EmptyState } from '../../components/states';
import { useEarningsSummary, useEarningsHistory, qk } from '../../hooks/queries';
import { uploadCommissionSlip } from '../../api/driver';
import { pickImage, appendImage } from '../../lib/media';
import { formatMoney, formatDate, formatPercent } from '../../lib/format';
import { colors } from '../../theme/colors';

const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  approved: { bg: '#e9f8ef', fg: '#0c8a4b' },
  pending: { bg: '#fdf0d8', fg: '#a86a15' },
  submitted: { bg: '#e5f0fb', fg: '#1d6fb8' },
  rejected: { bg: '#fdecec', fg: '#d94b5a' },
};

export default function Earnings() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState<string | undefined>(undefined);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const summaryQuery = useEarningsSummary(month);
  const historyQuery = useEarningsHistory();
  const summary = summaryQuery.data;

  const monthOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { value: string; label: string }[] = [];
    if (summary?.period?.value) {
      seen.add(summary.period.value);
      opts.push({ value: summary.period.value, label: summary.period.label || summary.period.value });
    }
    (historyQuery.data ?? []).forEach((e) => {
      if (e.period?.value && !seen.has(e.period.value)) {
        seen.add(e.period.value);
        opts.push({ value: e.period.value, label: e.period.label || e.period.value });
      }
    });
    return opts;
  }, [summary, historyQuery.data]);

  const slip = useMutation({
    mutationFn: async () => {
      const uri = await pickImage();
      if (!uri) return;
      const id = summary?.commission?.id;
      if (!id) throw new Error('No commission to attach a slip to.');
      const form = new FormData();
      await appendImage(form, 'slip', uri);
      await uploadCommissionSlip(id, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['earnings'] });
      Alert.alert('Uploaded', 'Your payment slip was submitted.');
    },
    onError: (err) => Alert.alert('Upload failed', err instanceof Error ? err.message : 'Try again.'),
  });

  const totals = summary?.totals;
  const commission = summary?.commission;
  const bank = summary?.bankDetails;
  const bookings = summary?.bookings ?? [];
  const discount = summary?.discount;
  const rateLabel = formatPercent(totals?.effectiveCommissionRate || totals?.commissionRate);
  const statusKey = (commission?.status ?? 'pending').toLowerCase();
  const tone = STATUS_TONE[statusKey] ?? STATUS_TONE.pending;
  const canUploadSlip = statusKey !== 'approved';

  return (
    <Screen>
      <GradientHeader
        eyebrow={`EARNINGS · ${(summary?.period?.label || '').toUpperCase()}`.trim()}
        pb={64}
        left={
          <IconButton onPress={() => router.back()}>
            <ChevronLeft size={18} color="#fff" strokeWidth={2} />
          </IconButton>
        }
      >
        <Text className="mt-1 font-xheavy text-[40px] text-white">{formatMoney(totals?.driverEarnings)}</Text>
        <View className="mt-2 flex-row">
          <View className="rounded-full bg-white/20 px-2.5 py-1">
            <Text className="font-heavy text-[12.5px] text-white">
              Commission due {formatMoney(totals?.commissionDue)}
            </Text>
          </View>
        </View>
      </GradientHeader>

      <BodySheet
        overlap={44}
        onRefresh={() => {
          summaryQuery.refetch();
          historyQuery.refetch();
        }}
        refreshing={summaryQuery.isRefetching}
      >
        {summaryQuery.isLoading ? (
          <Loading label="Loading earnings…" />
        ) : !summary ? (
          <Card className="p-6">
            <EmptyState
              title="No earnings to show yet"
              subtitle="When bookings are completed you'll see the commission due for that month here."
            />
          </Card>
        ) : (
          <>
            {/* Month selector (dropdown) */}
            <View className="mb-3 flex-row items-center gap-2">
              <Pressable
                onPress={() => setMonthPickerOpen(true)}
                className="flex-1 flex-row items-center justify-between rounded-xl border-[1.5px] border-line bg-white px-3.5 py-3"
              >
                <Text className="font-heavy text-[13.5px] text-ink">
                  {monthOptions.find((o) => o.value === (month ?? summary.period?.value))?.label ||
                    summary.period?.label ||
                    'This month'}
                </Text>
                <ChevronDown size={16} color={colors.muted} strokeWidth={2} />
              </Pressable>
              <IconButton variant="plain" onPress={() => summaryQuery.refetch()}>
                <RefreshCw size={16} color={colors.muted} strokeWidth={1.8} />
              </IconButton>
            </View>

            <Modal visible={monthPickerOpen} transparent animationType="fade" onRequestClose={() => setMonthPickerOpen(false)}>
              <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setMonthPickerOpen(false)}>
                <Pressable className="rounded-t-[24px] bg-white px-[18px] pb-8 pt-4">
                  <Text className="mb-2 px-1 font-xheavy text-[16px] text-ink">Select month</Text>
                  {(monthOptions.length ? monthOptions : [{ value: month ?? '', label: 'This month' }]).map((opt) => {
                    const active = (month ?? summary.period?.value) === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => {
                          setMonth(opt.value || undefined);
                          setMonthPickerOpen(false);
                        }}
                        className="flex-row items-center justify-between rounded-xl px-3 py-3.5 active:bg-canvas"
                      >
                        <Text className={`text-[14px] ${active ? 'font-heavy text-brand-dark' : 'font-semi text-ink'}`}>
                          {opt.label}
                        </Text>
                        {active ? <Check size={17} color={colors.brand} strokeWidth={2.5} /> : null}
                      </Pressable>
                    );
                  })}
                </Pressable>
              </Pressable>
            </Modal>

            {/* Stat cards (2 per row) */}
            <View className="flex-row flex-wrap justify-between">
              <StatCard label="Total booking value" value={formatMoney(totals?.totalGross)} />
              <StatCard label="Driver share" value={formatMoney(totals?.driverEarnings)} />
              <StatCard label={`Commission (${rateLabel})`} value={formatMoney(totals?.commissionDue)} highlight />
              <Card className="mb-2.5 w-[48%] p-3.5">
                <Text className="font-semi text-[12px] text-muted-soft">Payment status</Text>
                <View className="mt-1.5 self-start rounded-lg px-2.5 py-1" style={{ backgroundColor: tone.bg }}>
                  <Text className="font-xheavy text-[11px] uppercase" style={{ color: tone.fg }}>
                    {commission?.status || 'pending'}
                  </Text>
                </View>
                {commission?.paymentSlipUrl ? (
                  <View className="mt-2 flex-row items-center gap-1.5">
                    <BadgeCheck size={14} color={colors.brand} />
                    <Text className="font-heavy text-[12px] text-brand-dark">Slip on file</Text>
                  </View>
                ) : null}
              </Card>
            </View>

            {/* Commission programme */}
            <Card className="mt-3 p-4">
              <Text className="font-xheavy text-[12px] uppercase tracking-wide text-muted-soft">
                Commission programme
              </Text>
              {discount ? (
                <View className="mt-1.5 gap-1">
                  <Text className="font-heavy text-[14px] text-ink">{discount.name}</Text>
                  <Text className="font-med text-[13px] text-muted">
                    You're paying <Text className="font-heavy text-ink">{rateLabel}</Text> on bookings in this window.
                  </Text>
                </View>
              ) : (
                <Text className="mt-1.5 font-med text-[13px] text-muted">
                  No promotional discount this month. Standard commission is {rateLabel}.
                </Text>
              )}
            </Card>

            {/* Bank details + slip upload */}
            <Card className="mt-3 p-4">
              <Text className="font-heavy text-[14px] text-ink">Bank details</Text>
              <Text className="font-med text-[12px] text-muted-soft">
                Transfer the commission by {formatDate(summary.period?.commissionDueDate) || 'month end'} as a single payment.
              </Text>
              <View className="mt-3 flex-row flex-wrap gap-y-3">
                <DetailLine label="Account name" value={bank?.accountName} />
                <DetailLine label="Account number" value={bank?.accountNumber} />
                <DetailLine label="Bank" value={bank?.bankName} />
                <DetailLine label="Branch" value={bank?.branch} />
                {bank?.swiftCode ? <DetailLine label="SWIFT / BIC" value={bank.swiftCode} /> : null}
                <DetailLine label="Reference" value={bank?.referenceNote} />
              </View>
              {canUploadSlip ? (
                <Pressable
                  onPress={() => slip.mutate()}
                  disabled={slip.isPending}
                  className={`mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-brand py-3 ${slip.isPending ? 'opacity-70' : ''}`}
                >
                  <Upload size={16} color="#fff" strokeWidth={2} />
                  <Text className="font-heavy text-[13.5px] text-white">
                    {slip.isPending ? 'Uploading…' : 'Upload payment slip'}
                  </Text>
                </Pressable>
              ) : null}
            </Card>

            {/* Bookings this month */}
            <View className="mb-2.5 mt-5 flex-row items-center justify-between px-0.5">
              <Text className="font-xheavy text-[16px] text-ink">Bookings this month</Text>
              <Text className="font-med text-[12px] text-muted-soft">
                {totals?.bookingCount ?? bookings.length}
              </Text>
            </View>
            {bookings.length > 0 ? (
              <Card className="overflow-hidden">
                {bookings.map((b, i) => (
                  <View key={b.id || i}>
                    {i > 0 ? <Divider /> : null}
                    <View className="flex-row items-center justify-between px-4 py-3">
                      <View className="min-w-0 flex-1 pr-3">
                        <Text className="font-heavy text-[14px] text-ink" numberOfLines={1}>
                          {b.travelerName || 'Traveller'}
                        </Text>
                        <Text className="font-med text-[12px] text-muted-soft">
                          {formatDate(b.startDate)} – {formatDate(b.endDate)}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="font-heavy text-[14px] text-ink">{formatMoney(b.totalPrice)}</Text>
                        <Text className="font-heavy text-[11px] text-brand-dark">
                          +{formatMoney(b.driverEarnings)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </Card>
            ) : (
              <Card className="p-6">
                <Text className="text-center font-med text-[13px] text-muted">
                  No confirmed bookings were completed during this month.
                </Text>
              </Card>
            )}
          </>
        )}
      </BodySheet>
    </Screen>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={`mb-2.5 w-[48%] p-3.5 ${highlight ? 'bg-brand-tint' : ''}`}>
      <Text className={`font-semi text-[12px] ${highlight ? 'text-brand-dark' : 'text-muted-soft'}`}>{label}</Text>
      <Text className={`mt-1 font-xheavy text-[19px] ${highlight ? 'text-brand-dark' : 'text-ink'}`}>{value}</Text>
    </Card>
  );
}

function DetailLine({ label, value }: { label: string; value?: string }) {
  return (
    <View className="w-1/2 pr-2">
      <Text className="font-semi text-[11.5px] text-muted-soft">{label}</Text>
      <Text className="font-heavy text-[13px] text-ink">{value || '—'}</Text>
    </View>
  );
}
