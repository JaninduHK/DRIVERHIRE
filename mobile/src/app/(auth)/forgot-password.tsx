import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, MailCheck } from 'lucide-react-native';
import { Screen } from '../../components/Screen';
import { GradientHeader } from '../../components/GradientHeader';
import { BodySheet } from '../../components/BodySheet';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { IconButton } from '../../components/IconButton';
import { requestPasswordReset } from '../../api/auth';
import { colors } from '../../theme/colors';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Enter the email on your driver account.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await requestPasswordReset(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset email.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <GradientHeader
          eyebrow="ACCOUNT HELP"
          title="Reset your password"
          left={
            <IconButton onPress={() => router.back()}>
              <ChevronLeft size={18} color="#fff" strokeWidth={2} />
            </IconButton>
          }
        />
        <BodySheet>
          {sent ? (
            <Card className="items-center p-5">
              <View className="h-[68px] w-[68px] items-center justify-center rounded-[20px] bg-brand-tint">
                <MailCheck size={30} color={colors.brand} strokeWidth={1.7} />
              </View>
              <Text className="mt-4 font-xheavy text-[18px] text-ink">Check your email</Text>
              <Text className="mt-2 text-center font-med text-[13px] leading-5 text-muted">
                We sent a reset link to {email.trim().toLowerCase()}. Open it to choose a new password, then
                come back and sign in.
              </Text>
              <Button
                title="Back to sign in"
                variant="cta"
                className="mt-5"
                onPress={() => router.replace('/(auth)/login')}
              />
            </Card>
          ) : (
            <Card className="p-4">
              <Text className="mb-3.5 font-med text-[13.5px] leading-5 text-muted">
                Enter the email on your driver account and we will send a secure reset link.
              </Text>
              <TextField
                label="Email address"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {error ? <Text className="mt-3 font-med text-[12.5px] text-danger">{error}</Text> : null}
              <Button
                title="Send reset link"
                variant="cta"
                className="mt-4"
                loading={submitting}
                onPress={handleSubmit}
              />
            </Card>
          )}
        </BodySheet>
      </KeyboardAvoidingView>
    </Screen>
  );
}
