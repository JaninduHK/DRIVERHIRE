import { useEffect, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, MapPin, Trash2 } from 'lucide-react-native';
import { Screen } from '../../components/Screen';
import { GradientHeader } from '../../components/GradientHeader';
import { BodySheet } from '../../components/BodySheet';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { Chip } from '../../components/Chip';
import { Toggle } from '../../components/Toggle';
import { Divider } from '../../components/Divider';
import { IconButton } from '../../components/IconButton';
import { Loading } from '../../components/states';
import { useVehicles } from '../../hooks/queries';
import {
  getVehicleAvailability,
  createVehicleAvailability,
  deleteVehicleAvailability,
  type AvailabilityBlock,
} from '../../api/driver';
import { updateProfile } from '../../api/auth';
import { asList, formatDate } from '../../lib/format';
import { useAuth } from '../../auth/AuthContext';
import { colors } from '../../theme/colors';
import type { User } from '../../types';

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const normalizeUser = (p: { user: User } | User): User =>
  p && typeof p === 'object' && 'user' in p ? (p as { user: User }).user : (p as User);

export default function Availability() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, setUser } = useAuth();

  const [available, setAvailable] = useState(true);
  const [location, setLocation] = useState(user?.driverLocation?.label ?? user?.address ?? '');
  const [savingLoc, setSavingLoc] = useState(false);

  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles();
  const [vehicleId, setVehicleId] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!vehicleId && vehicles?.length) setVehicleId(vehicles[0].id);
  }, [vehicles, vehicleId]);

  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const availabilityQuery = useQuery<AvailabilityBlock[]>({
    queryKey: ['availability', vehicleId],
    queryFn: async () => asList<AvailabilityBlock>(await getVehicleAvailability(String(vehicleId)), 'availability'),
    enabled: Boolean(vehicleId),
  });

  const addBlock = useMutation({
    mutationFn: () =>
      createVehicleAvailability(String(vehicleId), { startDate: start, endDate: end, status: 'blocked' }),
    onSuccess: () => {
      setStart('');
      setEnd('');
      queryClient.invalidateQueries({ queryKey: ['availability', vehicleId] });
    },
    onError: (err) => Alert.alert('Could not block dates', err instanceof Error ? err.message : 'Try again.'),
  });

  const removeBlock = useMutation({
    mutationFn: (blockId: string) => deleteVehicleAvailability(String(vehicleId), blockId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['availability', vehicleId] }),
  });

  const saveLocation = async () => {
    setSavingLoc(true);
    try {
      const form = new FormData();
      form.append('currentLocationLabel', location.trim());
      const updated = normalizeUser(await updateProfile(form));
      setUser(updated);
      Alert.alert('Saved', 'Your start location has been updated.');
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSavingLoc(false);
    }
  };

  const canAdd = ISO_RE.test(start) && ISO_RE.test(end) && !addBlock.isPending;

  return (
    <Screen>
      <GradientHeader
        eyebrow="DAILY CHECK IN"
        title="My Availability"
        left={
          <IconButton onPress={() => router.back()}>
            <ChevronLeft size={18} color="#fff" strokeWidth={2} />
          </IconButton>
        }
      />
      <BodySheet>
        {/* Available today */}
        <Card className="p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="h-2.5 w-2.5 rounded-full bg-brand" />
              <Text className="font-heavy text-[15px] text-ink">Available today</Text>
            </View>
            <Toggle value={available} onChange={setAvailable} />
          </View>
          <Text className="mt-2.5 font-med text-[12.5px] leading-5 text-muted-soft">
            Travellers see your live availability while this is on.
          </Text>
        </Card>

        {/* Start location */}
        <Card className="mt-3 p-4">
          <TextField
            label="Today's start location"
            value={location}
            onChangeText={setLocation}
            placeholder="Colombo city centre"
            rightSlot={<MapPin size={15} color={colors.brand} strokeWidth={1.8} />}
          />
          <Button title="Save start location" variant="secondary" className="mt-3 w-full" loading={savingLoc} onPress={saveLocation} />
        </Card>

        {/* Block out dates */}
        <Text className="mb-2.5 mt-5 px-0.5 font-heavy text-[14px] text-ink">Block out dates</Text>
        {vehiclesLoading ? (
          <Loading />
        ) : !vehicles?.length ? (
          <Card className="p-5">
            <Text className="text-center font-med text-[13px] text-muted">Add a vehicle first to manage its availability.</Text>
          </Card>
        ) : (
          <Card className="p-4">
            {vehicles.length > 1 ? (
              <View className="mb-3 flex-row flex-wrap gap-1.5">
                {vehicles.map((v) => (
                  <Chip key={v.id} label={v.model} selected={vehicleId === v.id} onPress={() => setVehicleId(v.id)} />
                ))}
              </View>
            ) : null}
            <View className="flex-row gap-2.5">
              <TextField className="flex-1" label="From" value={start} onChangeText={setStart} placeholder="2026-02-12" autoCapitalize="none" />
              <TextField className="flex-1" label="To" value={end} onChangeText={setEnd} placeholder="2026-02-14" autoCapitalize="none" />
            </View>
            <Button title="Block these dates" variant="primary" className="mt-3 w-full" disabled={!canAdd} loading={addBlock.isPending} onPress={() => addBlock.mutate()} />

            {availabilityQuery.data && availabilityQuery.data.length > 0 ? (
              <View className="mt-3">
                {availabilityQuery.data.map((b, i) => (
                  <View key={b.id}>
                    {i > 0 ? <Divider className="mx-0" /> : null}
                    <View className="flex-row items-center justify-between py-2.5">
                      <View>
                        <Text className="font-heavy text-[13px] text-ink">
                          {formatDate(b.startDate)} — {formatDate(b.endDate)}
                        </Text>
                        <Text className="font-med text-[11.5px] text-muted-soft capitalize">{b.status}</Text>
                      </View>
                      <IconButton variant="plain" onPress={() => removeBlock.mutate(b.id)}>
                        <Trash2 size={16} color={colors.danger} strokeWidth={1.8} />
                      </IconButton>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </Card>
        )}
      </BodySheet>
    </Screen>
  );
}
