import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Screen } from '../../components/Screen';
import { GradientHeader } from '../../components/GradientHeader';
import { BodySheet } from '../../components/BodySheet';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { IconButton } from '../../components/IconButton';
import { Loading, EmptyState } from '../../components/states';
import { useBriefs } from '../../hooks/queries';
import { formatDateRange, formatMoney, relativeTime } from '../../lib/format';
import type { Brief } from '../../types';

export default function Briefs() {
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useBriefs();
  const briefs = data ?? [];

  return (
    <Screen>
      <GradientHeader
        eyebrow="OPEN REQUESTS"
        title="Tour Briefs"
        subtitle="Trips travellers posted. Send an offer."
        left={
          <IconButton onPress={() => router.back()}>
            <ChevronLeft size={18} color="#fff" strokeWidth={2} />
          </IconButton>
        }
      />
      <BodySheet onRefresh={refetch} refreshing={isRefetching}>
        {isLoading ? (
          <Loading />
        ) : briefs.length === 0 ? (
          <Card className="p-5">
            <EmptyState title="No open briefs" subtitle="New trip requests from travellers will appear here." />
          </Card>
        ) : (
          <View className="gap-3">
            {briefs.map((brief, i) => (
              <BriefCard key={brief.id} brief={brief} fresh={i === 0} onPress={() => router.push(`/(app)/request/${brief.id}`)} />
            ))}
          </View>
        )}
      </BodySheet>
    </Screen>
  );
}

function BriefCard({ brief, fresh, onPress }: { brief: Brief; fresh: boolean; onPress: () => void }) {
  const tags = [
    formatDateRange(brief.startDate, brief.endDate),
    brief.guests ? `${brief.guests} guests` : null,
    brief.budget ? `About ${formatMoney(brief.budget)}` : brief.budgetHint || null,
  ].filter(Boolean) as string[];

  return (
    <Card className={`p-4 ${fresh ? 'border-l-4 border-brand' : ''}`}>
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 font-heavy text-[15.5px] text-ink" numberOfLines={1}>
          {brief.title || brief.route || 'Trip request'}
        </Text>
        {fresh ? (
          <Chip label="NEW" tone="brand" />
        ) : (
          <Text className="font-heavy text-[11px] text-muted-soft">{relativeTime(brief.createdAt)}</Text>
        )}
      </View>
      {tags.length ? (
        <View className="mt-2.5 flex-row flex-wrap gap-1.5">
          {tags.map((t) => (
            <Chip key={t} label={t} tone="neutral" />
          ))}
        </View>
      ) : null}
      {brief.description ? (
        <Text className="mt-3 font-med text-[13px] leading-5 text-muted" numberOfLines={3}>
          {brief.description}
        </Text>
      ) : null}
      <View className="mt-3 flex-row gap-2">
        <Button title="Send offer" variant="primary" className="flex-1" onPress={onPress} />
        <Button title="View" variant="secondary" onPress={onPress} />
      </View>
    </Card>
  );
}
