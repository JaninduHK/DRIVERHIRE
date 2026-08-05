import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../auth/AuthContext';

export default function AuthLayout() {
  const { status, user } = useAuth();

  // Approved drivers never see the auth stack.
  if (status === 'authenticated' && user?.driverStatus === 'approved') {
    return <Redirect href="/(app)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="register" />
      <Stack.Screen name="pending" />
    </Stack>
  );
}
