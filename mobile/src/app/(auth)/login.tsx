import { useState } from 'react';
import { View, Text, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Screen } from '../../components/Screen';
import { GradientHeader } from '../../components/GradientHeader';
import { BodySheet } from '../../components/BodySheet';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { IconButton } from '../../components/IconButton';
import { useAuth } from '../../auth/AuthContext';
import type { User } from '../../types';

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const routeAfterLogin = (user: User) => {
    if (user.driverStatus === 'approved') {
      router.replace('/(app)');
    } else {
      router.replace('/(auth)/pending');
    }
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email.trim().toLowerCase(), password);
      routeAfterLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <GradientHeader
          eyebrow="DRIVER PORTAL"
          title="Welcome back"
          subtitle="Sign in to see today's requests."
          left={
            <IconButton onPress={() => router.back()}>
              <ChevronLeft size={18} color="#fff" strokeWidth={2} />
            </IconButton>
          }
        />
        <BodySheet>
          <Card className="p-4">
            <TextField
              label="Email address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextField
              className="mt-4"
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secure
              autoCapitalize="none"
              labelRight={
                <Pressable onPress={() => router.push('/(auth)/forgot-password')} hitSlop={8}>
                  <Text className="font-heavy text-[12.5px] text-brand-dark">Forgot?</Text>
                </Pressable>
              }
            />
            {error ? <Text className="mt-3 font-med text-[12.5px] text-danger">{error}</Text> : null}
            <Button title="Sign in" variant="cta" className="mt-[18px]" loading={submitting} onPress={handleSubmit} />
          </Card>

          <Pressable className="mt-6 flex-row justify-center" onPress={() => router.push('/(auth)/register')}>
            <Text className="font-med text-[13.5px] text-muted">New driver? </Text>
            <Text className="font-heavy text-[13.5px] text-brand-dark">Create an account</Text>
          </Pressable>
        </BodySheet>
      </KeyboardAvoidingView>
    </Screen>
  );
}
