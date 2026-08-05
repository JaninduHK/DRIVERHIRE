import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Plus, Car } from 'lucide-react-native';
import { Screen } from '../../../components/Screen';
import { GradientHeader } from '../../../components/GradientHeader';
import { BodySheet } from '../../../components/BodySheet';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Chip } from '../../../components/Chip';
import { IconButton } from '../../../components/IconButton';
import { Loading, EmptyState } from '../../../components/states';
import { useVehicles } from '../../../hooks/queries';
import { formatMoney, formatDate } from '../../../lib/format';
import { colors } from '../../../theme/colors';
import type { Vehicle } from '../../../types';

const FEATURES: { key: keyof Vehicle; label: string }[] = [
  { key: 'englishSpeakingDriver', label: 'English speaking driver' },
  { key: 'fuelAndInsurance', label: 'Fuel and insurance' },
  { key: 'meetAndGreetAtAirport', label: 'Airport meet and greet' },
  { key: 'allTaxes', label: 'All taxes' },
];

export default function Vehicles() {
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useVehicles();
  const vehicles = data ?? [];

  return (
    <Screen>
      <GradientHeader
        eyebrow="FLEET"
        title="My Vehicles"
        subtitle="Manage what travellers can book."
        left={
          <IconButton onPress={() => router.back()}>
            <ChevronLeft size={18} color="#fff" strokeWidth={2} />
          </IconButton>
        }
      />
      <BodySheet onRefresh={refetch} refreshing={isRefetching}>
        <Button
          title="Add vehicle"
          variant="cta"
          leftIcon={<Plus size={18} color="#fff" strokeWidth={2} />}
          onPress={() => router.push('/(app)/vehicles/new')}
        />

        {isLoading ? (
          <Loading />
        ) : vehicles.length === 0 ? (
          <Card className="mt-3.5 p-5">
            <EmptyState title="No vehicles yet" subtitle="Add your first vehicle to start receiving bookings." />
          </Card>
        ) : (
          <View className="mt-3.5 gap-3">
            {vehicles.map((v) => (
              <VehicleCard key={v.id} vehicle={v} onEdit={() => router.push(`/(app)/vehicles/${v.id}`)} />
            ))}
          </View>
        )}
      </BodySheet>
    </Screen>
  );
}

function VehicleCard({ vehicle, onEdit }: { vehicle: Vehicle; onEdit: () => void }) {
  const status = (vehicle.status ?? 'approved').toLowerCase();
  const pending = status === 'pending';
  const features = FEATURES.filter((f) => vehicle[f.key]);

  return (
    <Card className={`p-4 ${pending ? 'border-l-4 border-[#f0b429]' : ''}`}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="font-heavy text-[17px] text-ink">{vehicle.model}</Text>
            <Chip label={status.toUpperCase()} tone={pending ? 'warn' : 'brand'} />
          </View>
          <Text className="mt-0.5 font-med text-[12.5px] text-muted-soft">
            {vehicle.year}
            {vehicle.createdAt ? `, added ${formatDate(vehicle.createdAt)}` : ''}
          </Text>
        </View>
        <View className="h-[50px] w-[50px] items-center justify-center rounded-[13px] bg-[#eef1f0]">
          <Car size={24} color={colors.mutedSoft} strokeWidth={1.6} />
        </View>
      </View>

      <View className="my-3 flex-row gap-4">
        <Text className="font-heavy text-[13.5px] text-brand-dark">{formatMoney(vehicle.pricePerDay)} per day</Text>
        {vehicle.seats ? <Text className="font-heavy text-[13.5px] text-muted">{vehicle.seats} seats</Text> : null}
      </View>

      {features.length > 0 ? (
        <View className="mb-3 flex-row flex-wrap gap-1.5">
          {features.map((f) => (
            <Chip key={f.label} label={f.label} tone="brand" />
          ))}
        </View>
      ) : null}

      {pending ? (
        <View className="mb-3 rounded-[11px] border border-[#f4e2c2] bg-[#fff8ec] px-3 py-2.5">
          <Text className="font-semi text-[12.5px] leading-5 text-[#7a5a15]">
            Waiting on admin approval, usually one working day.
          </Text>
        </View>
      ) : null}

      <Button title="Edit details" variant="secondary" className="w-full" onPress={onEdit} />
    </Card>
  );
}
