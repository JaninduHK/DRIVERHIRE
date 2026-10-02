import { useMemo } from 'react';
import { KeyboardAvoidingView, Platform, Alert, Pressable, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Trash2 } from 'lucide-react-native';
import { Screen } from '../../../components/Screen';
import { GradientHeader } from '../../../components/GradientHeader';
import { BodySheet } from '../../../components/BodySheet';
import { IconButton } from '../../../components/IconButton';
import { VehicleForm } from '../../../components/VehicleForm';
import { EmptyState } from '../../../components/states';
import { updateVehicle, deleteVehicle } from '../../../api/driver';
import { useVehicles, qk } from '../../../hooks/queries';

export default function EditVehicle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: vehicles } = useVehicles();
  const vehicle = useMemo(() => (vehicles ?? []).find((v) => v.id === id), [vehicles, id]);

  const update = useMutation({
    mutationFn: (form: FormData) => updateVehicle(String(id), form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.vehicles });
      Alert.alert('Saved', 'Your vehicle details were updated.', [{ text: 'Done', onPress: () => router.back() }]);
    },
    onError: (err) => Alert.alert('Could not save', err instanceof Error ? err.message : 'Try again.'),
  });

  const remove = useMutation({
    mutationFn: () => deleteVehicle(String(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.vehicles });
      Alert.alert('Deleted', 'The vehicle has been removed.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    },
    // A 409 here means the vehicle still has upcoming bookings; the server says which.
    onError: (err) =>
      Alert.alert('Could not delete', err instanceof Error ? err.message : 'Try again.'),
  });

  const confirmDelete = () => {
    Alert.alert(
      `Delete ${vehicle?.model ?? 'this vehicle'}?`,
      'It stops appearing in search and in your vehicle list, and any offer still waiting on it is withdrawn. Past bookings and reviews keep showing it. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => remove.mutate() },
      ]
    );
  };

  return (
    <Screen>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <GradientHeader
          eyebrow="FLEET"
          title="Edit vehicle"
          subtitle={vehicle?.model}
          left={
            <IconButton onPress={() => router.back()}>
              <ChevronLeft size={18} color="#fff" strokeWidth={2} />
            </IconButton>
          }
        />
        <BodySheet>
          {vehicle ? (
            <>
              <VehicleForm initial={vehicle} submitLabel="Save changes" submitting={update.isPending} onSubmit={(f) => update.mutate(f)} />
              <Pressable
                onPress={confirmDelete}
                disabled={remove.isPending}
                className={`mt-3 h-12 flex-row items-center justify-center gap-2 rounded-xl border-[1.5px] border-[#ffd2da] bg-[#fff5f6] ${
                  remove.isPending ? 'opacity-60' : 'active:bg-[#ffe9ec]'
                }`}
              >
                <Trash2 size={16} color="#e11d48" strokeWidth={2} />
                <Text className="font-heavy text-[14px] text-[#e11d48]">
                  {remove.isPending ? 'Deleting…' : 'Delete vehicle'}
                </Text>
              </Pressable>
            </>
          ) : (
            <EmptyState title="Vehicle not found" subtitle="It may have been removed. Go back and refresh." />
          )}
        </BodySheet>
      </KeyboardAvoidingView>
    </Screen>
  );
}
