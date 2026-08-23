import { Redirect } from 'expo-router';
import { useAuth } from '../auth/AuthContext';
import { AnimatedSplash } from '../components/AnimatedSplash';
import { SessionErrorScreen } from '../components/SessionErrorScreen';

export default function Index() {
  const { status, user, retry } = useAuth();

  if (status === 'loading') {
    return <AnimatedSplash />;
  }

  if (status === 'error') {
    return <SessionErrorScreen onRetry={retry} />;
  }

  if (status === 'unauthenticated' || !user) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (user.driverStatus !== 'approved') {
    return <Redirect href="/(auth)/pending" />;
  }

  return <Redirect href="/(app)" />;
}
