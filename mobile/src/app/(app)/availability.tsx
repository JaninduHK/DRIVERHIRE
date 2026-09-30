import { useEffect, useState } from 'react';
import { View, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, MapPin, Trash2 } from 'lucide-react-native';
import { Screen } from '../../components/Screen';
import { GradientHeader } from '../../components/GradientHeader';
import { BodySheet } from '../../components/BodySheet';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { DatePickerField } from '../../components/DatePickerField';
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
  AVAILABILITY_STATUS,
  type AvailabilityBlock,
  type AvailabilityStatus,
} from '../../api/driver';
import { updateProfile } from '../../api/auth';
import { useLiveLocationSharing } from '../../hooks/useLiveLocationSharing';
import { asList, formatDate } from '../../lib/format';
import { getDeviceLocation, type DeviceCoords } from '../../lib/location';
import { useAuth } from '../../auth/AuthContext';
import { colors } from '../../theme/colors';
import type { User } from '../../types';

const normalizeUser = (p: { user: User } | User): User =>
  p && typeof p === 'object' && 'user' in p ? (p as { user: User }).user : (p as User);

// Midnight today: the earliest date a driver can sensibly mark, and the floor for
// both pickers.
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export default function Availability() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, setUser } = useAuth();

  const { sharing: shareLocation, saving: savingShare, setSharing: setShareLocation } =
    useLiveLocationSharing();
  const [location, setLocation] = useState(user?.driverLocation?.label ?? user?.address ?? '');
  const [savingLoc, setSavingLoc] = useState(false);

  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles();
  const [vehicleId, setVehicleId] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!vehicleId && vehicles?.length) setVehicleId(vehicles[0].id);
  }, [vehicles, vehicleId]);

  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  // Blocking dates is the common action, so that is the default.
  const [status, setStatus] = useState<AvailabilityStatus>(AVAILABILITY_STATUS.UNAVAILABLE);
  const blocking = status === AVAILABILITY_STATUS.UNAVAILABLE;

  const availabilityQuery = useQuery<AvailabilityBlock[]>({
    queryKey: ['availability', vehicleId],
    queryFn: async () => asList<AvailabilityBlock>(await getVehicleAvailability(String(vehicleId)), 'availability'),
    enabled: Boolean(vehicleId),
  });

  const addBlock = useMutation({
    mutationFn: () =>
      createVehicleAvailability(String(vehicleId), { startDate: start, endDate: end, status }),
    onSuccess: () => {
      setStart('');
      setEnd('');
      queryClient.invalidateQueries({ queryKey: ['availability', vehicleId] });
    },
    onError: (err) =>
      Alert.alert('Could not save dates', err instanceof Error ? err.message : 'Try again.'),
  });

  const removeBlock = useMutation({
    mutationFn: (blockId: string) => deleteVehicleAvailability(String(vehicleId), blockId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['availability', vehicleId] }),
    onError: (err) =>
      Alert.alert('Could not remove', err instanceof Error ? err.message : 'Try again.'),
  });

  const hasSavedPin = Number.isFinite(user?.driverLocation?.latitude);

  const saveLocation = async () => {
    setSavingLoc(true);
    try {
      // The pin on the traveller map comes from the device, not the typed name.
      let coords: DeviceCoords | null = null;
      try {
        coords = await getDeviceLocation();
      } catch {
        // Without a previous pin there is nothing to attach the name to, and the
        // API rejects a location with no coordinates.
        if (!hasSavedPin) {
          Alert.alert(
            'Location permission needed',
            'Allow location access so travellers can see where you are starting from today.'
          );
          return;
        }
      }

      const form = new FormData();
      form.append('currentLocationLabel', location.trim());
      if (coords) {
        form.append('currentLatitude', String(coords.latitude));
        form.append('currentLongitude', String(coords.longitude));
      }
      setUser(normalizeUser(await updateProfile(form)));
      Alert.alert(
        'Saved',
        coords
          ? 'Your start location and map pin have been updated.'
          : 'Name saved. We could not read your GPS, so your previous pin was kept.'
      );
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSavingLoc(false);
    }
  };

  const canAdd = Boolean(start) && Boolean(end) && end >= start && !addBlock.isPending;

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
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <BodySheet>
          {/* Available today */}
          <Card className="p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className={`h-2.5 w-2.5 rounded-full ${shareLocation ? 'bg-brand' : 'bg-line'}`} />
                <Text className="font-heavy text-[15px] text-ink">Available today</Text>
              </View>
              <Toggle value={shareLocation} onChange={setShareLocation} disabled={savingShare} />
            </View>
            <Text className="mt-2.5 font-med text-[12.5px] leading-5 text-muted-soft">
              {shareLocation
                ? 'Travellers can see your start location on the live map.'
                : 'You are hidden from the live map. Your blocked dates below still apply.'}
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
            <Text className="mt-2 font-med text-[11.5px] leading-4 text-muted-soft">
              Saving uses your device location for the map pin.
            </Text>
            <Button
              title="Save start location"
              variant="secondary"
              className="mt-3 w-full"
              loading={savingLoc}
              onPress={saveLocation}
            />
          </Card>

          {/* Vehicle calendar */}
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

              <Text className="mb-1.5 font-heavy text-[12.5px] text-ink-soft">Mark these dates as</Text>
              <View className="mb-3 flex-row gap-1.5">
                <Chip
                  label="Unavailable"
                  selected={blocking}
                  onPress={() => setStatus(AVAILABILITY_STATUS.UNAVAILABLE)}
                />
                <Chip
                  label="Available"
                  selected={!blocking}
                  onPress={() => setStatus(AVAILABILITY_STATUS.AVAILABLE)}
                />
              </View>

              <View className="flex-row gap-2.5">
                <DatePickerField className="flex-1" label="From" value={start} onChange={setStart} minimumDate={startOfToday()} />
                <DatePickerField
                  className="flex-1"
                  label="To"
                  value={end}
                  onChange={setEnd}
                  minimumDate={start ? new Date(`${start}T00:00:00`) : startOfToday()}
                />
              </View>

              <Text className="mt-2 font-med text-[11.5px] leading-4 text-muted-soft">
                {blocking
                  ? 'Travellers cannot request these dates while they are blocked.'
                  : 'A note to yourself that you are free. To reopen blocked dates, delete the block below.'}
              </Text>

              <Button
                title={blocking ? 'Block these dates' : 'Mark as available'}
                variant="primary"
                className="mt-3 w-full"
                disabled={!canAdd}
                loading={addBlock.isPending}
                onPress={() => addBlock.mutate()}
              />

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
      </KeyboardAvoidingView>
    </Screen>
  );
}
