import { KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import { Screen } from '../../../components/Screen';
import { GradientHeader } from '../../../components/GradientHeader';
import { BodySheet } from '../../../components/BodySheet';
import { IconButton } from '../../../components/IconButton';
import { VehicleForm } from '../../../components/VehicleForm';
import { createVehicle } from '../../../api/driver';
import { qk } from '../../../hooks/queries';

export default function NewVehicle() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (form: FormData) => createVehicle(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.vehicles });
      Alert.alert('Submitted', 'Your vehicle was submitted for approval.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    },
    onError: (err) => Alert.alert('Could not submit', err instanceof Error ? err.message : 'Try again.'),
  });

  return (
    <Screen>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <GradientHeader
          eyebrow="FLEET"
          title="Submit a vehicle"
          subtitle="Complete details are approved faster."
          left={
            <IconButton onPress={() => router.back()}>
              <ChevronLeft size={18} color="#fff" strokeWidth={2} />
            </IconButton>
          }
        />
        <BodySheet>
          <VehicleForm submitLabel="Submit for approval" submitting={create.isPending} onSubmit={(f) => create.mutate(f)} />
        </BodySheet>
      </KeyboardAvoidingView>
    </Screen>
  );
}
