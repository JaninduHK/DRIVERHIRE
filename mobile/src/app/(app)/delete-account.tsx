import { useState } from 'react';
import { View, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, AlertTriangle } from 'lucide-react-native';
import { Screen } from '../../components/Screen';
import { GradientHeader } from '../../components/GradientHeader';
import { BodySheet } from '../../components/BodySheet';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { IconButton } from '../../components/IconButton';
import { deleteOwnAccount } from '../../api/auth';
import { useAuth } from '../../auth/AuthContext';

/**
 * In-app account deletion, required by App Store Review Guideline 5.1.1(v) for any
 * app that lets people create an account.
 *
 * The wording is deliberate: personal details are erased, but past bookings are kept
 * in anonymised form because they are financial records. "Delete my account" and
 * "erase my trip history" are different asks, and a driver should not discover the
 * difference afterwards.
 */
export default function DeleteAccount() {
  const router = useRouter();
  const { logout } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const runDelete = async () => {
    setError('');
    setDeleting(true);
    try {
      await deleteOwnAccount(password);
      // The access token is rejected the moment deletedAt is set, so clear the
      // session locally; logout swallows the inevitable server-side failure.
      await logout();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete your account right now.');
      setDeleting(false);
    }
  };

  const confirm = () => {
    setError('');
    if (!password) {
      setError('Enter your password to confirm.');
      return;
    }
    Alert.alert(
      'Delete your account?',
      'This permanently removes your name, email, phone number and other personal details. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete account', style: 'destructive', onPress: runDelete },
      ]
    );
  };

  return (
    <Screen>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <GradientHeader
          eyebrow="ACCOUNT"
          title="Delete account"
          left={
            <IconButton onPress={() => router.back()}>
              <ChevronLeft size={18} color="#fff" strokeWidth={2} />
            </IconButton>
          }
        />
        <BodySheet>
          <Card className="p-4">
            <View className="flex-row items-start">
              <AlertTriangle size={18} color="#e11d48" strokeWidth={2} />
              <View className="ml-2.5 flex-1">
                <Text className="font-heavy text-[15px] text-ink">This cannot be undone</Text>
                <Text className="mt-1 font-med text-[12.5px] leading-[18px] text-ink-soft">
                  Deleting your account permanently removes your name, email address, phone number,
                  address, profile photo and vehicle photos. You will be signed out immediately and
                  will no longer receive trip requests.
                </Text>
                <Text className="mt-2 font-med text-[12px] leading-[17px] text-muted">
                  Your past bookings are kept as anonymous records, because we are required to retain
                  payment and tax history. They will no longer be linked to you.
                </Text>
              </View>
            </View>
          </Card>

          <Card className="mt-3 p-4">
            <Text className="font-heavy text-[13.5px] text-ink">Confirm it&apos;s you</Text>
            <TextField
              className="mt-3"
              label="Your password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secure
              autoCapitalize="none"
            />
            {error ? <Text className="mt-3 font-med text-[12.5px] text-danger">{error}</Text> : null}
            <Button
              title="Delete my account"
              variant="cta"
              className="mt-4"
              loading={deleting}
              onPress={confirm}
            />
            <Button
              title="Cancel"
              variant="secondary"
              className="mt-2"
              onPress={() => router.back()}
            />
          </Card>
        </BodySheet>
      </KeyboardAvoidingView>
    </Screen>
  );
}
