import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../auth/AuthContext';
import { usePush } from '../../hooks/usePush';

export default function AppLayout() {
  const { status, user } = useAuth();
  usePush();

  if (status === 'loading') return null;
  if (status === 'unauthenticated' || !user) return <Redirect href="/(auth)/welcome" />;
  if (user.driverStatus !== 'approved') return <Redirect href="/(auth)/pending" />;

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="menu"
        options={{ presentation: 'transparentModal', animation: 'fade', animationDuration: 180 }}
      />
      <Stack.Screen name="briefs" />
      <Stack.Screen name="earnings" />
      <Stack.Screen name="availability" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="change-password" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="request/[id]" />
      <Stack.Screen name="vehicles/index" />
      <Stack.Screen name="vehicles/new" />
      <Stack.Screen name="vehicles/[id]" />
    </Stack>
  );
}
