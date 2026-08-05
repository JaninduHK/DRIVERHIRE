import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Screen } from '../../components/Screen';
import { GradientHeader } from '../../components/GradientHeader';
import { BodySheet } from '../../components/BodySheet';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { IconButton } from '../../components/IconButton';
import { updatePassword } from '../../api/auth';

export default function ChangePassword() {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    if (!current || !next || !confirm) {
      setError('Please fill in all fields.');
      return;
    }
    if (next.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await updatePassword(current, next);
      setSuccess('Your password has been updated.');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <GradientHeader
          eyebrow="SECURITY"
          title="Change password"
          left={
            <IconButton onPress={() => router.back()}>
              <ChevronLeft size={18} color="#fff" strokeWidth={2} />
            </IconButton>
          }
        />
        <BodySheet>
          <Card className="p-4">
            <TextField label="Current password" value={current} onChangeText={setCurrent} placeholder="Your current password" secure autoCapitalize="none" />
            <TextField className="mt-3" label="New password" value={next} onChangeText={setNext} placeholder="Minimum 8 characters" secure autoCapitalize="none" />
            <TextField className="mt-3" label="Confirm new password" value={confirm} onChangeText={setConfirm} placeholder="Re-enter new password" secure autoCapitalize="none" />
            {error ? <Text className="mt-3 font-med text-[12.5px] text-danger">{error}</Text> : null}
            {success ? <Text className="mt-3 font-med text-[12.5px] text-brand-dark">{success}</Text> : null}
            <Button title="Update password" variant="cta" className="mt-4" loading={saving} onPress={handleSubmit} />
          </Card>
        </BodySheet>
      </KeyboardAvoidingView>
    </Screen>
  );
}
