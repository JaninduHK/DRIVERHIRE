import { useMemo } from 'react';
import { KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import { Screen } from '../../../components/Screen';
import { GradientHeader } from '../../../components/GradientHeader';
import { BodySheet } from '../../../components/BodySheet';
import { IconButton } from '../../../components/IconButton';
import { VehicleForm } from '../../../components/VehicleForm';
import { EmptyState } from '../../../components/states';
import { updateVehicle } from '../../../api/driver';
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
            <VehicleForm initial={vehicle} submitLabel="Save changes" submitting={update.isPending} onSubmit={(f) => update.mutate(f)} />
          ) : (
            <EmptyState title="Vehicle not found" subtitle="It may have been removed. Go back and refresh." />
          )}
        </BodySheet>
      </KeyboardAvoidingView>
    </Screen>
  );
}
