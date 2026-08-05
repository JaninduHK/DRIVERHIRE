import { Redirect } from 'expo-router';
import { useAuth } from '../auth/AuthContext';
import { AnimatedSplash } from '../components/AnimatedSplash';

export default function Index() {
  const { status, user } = useAuth();

  if (status === 'loading') {
    return <AnimatedSplash />;
  }

  if (status === 'unauthenticated' || !user) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (user.driverStatus !== 'approved') {
    return <Redirect href="/(auth)/pending" />;
  }

  return <Redirect href="/(app)" />;
}
