import { useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, Check } from 'lucide-react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useAuth } from '../../auth/AuthContext';
import { colors } from '../../theme/colors';

export default function Pending() {
  const router = useRouter();
  const { user, refreshUser, logout } = useAuth();
  const [checking, setChecking] = useState(false);

  const rejected = user?.driverStatus === 'rejected';

  const handleRefresh = async () => {
    setChecking(true);
    await refreshUser();
    setChecking(false);
    // If approval landed, index.tsx / (app) guard will take over on next render.
    router.replace('/');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/welcome');
  };

  return (
    <Screen statusBarStyle="dark" edges={['top', 'bottom']}>
      <View className="flex-1 px-6 pt-10">
        <View className="items-center pt-8">
          <View className="h-[92px] w-[92px] items-center justify-center rounded-[28px] bg-brand-tint">
            <Clock size={42} color={colors.brand} strokeWidth={1.7} />
          </View>
          <Text className="mt-5 font-xheavy text-[24px] text-ink">
            {rejected ? 'Application not approved' : `Hi ${user?.name?.split(' ')[0] ?? 'there'}`}
          </Text>
          <Text className="mt-2.5 text-center font-med text-[14.5px] leading-[22px] text-muted">
            {rejected
              ? 'Your driver application was not approved. Contact support if you think this is a mistake.'
              : 'Your driver profile is under review. We usually approve within one working day and will notify you here and by email.'}
          </Text>
        </View>

        {!rejected && (
          <Card className="mt-6 p-4">
            <Text className="font-heavy text-[14px] text-ink">Review progress</Text>
            <View className="mt-3.5 gap-3.5">
              <Row done label="Documents submitted" note="Received by our team" />
              <Row active label="Verification in progress" note="Usually under 24 hours" />
              <Row muted label="Profile goes live" note="Then you can start quoting" />
            </View>
          </Card>
        )}

        <View className="mt-auto gap-2.5 pb-2">
          {!rejected && (
            <Button title="Check approval status" variant="cta" loading={checking} onPress={handleRefresh} />
          )}
          <Button title="Log out" variant="secondary" className="py-[15px]" onPress={handleLogout} />
        </View>
      </View>
    </Screen>
  );
}

function Row({ label, note, done, active, muted }: { label: string; note: string; done?: boolean; active?: boolean; muted?: boolean }) {
  return (
    <View className="flex-row gap-3">
      {done ? (
        <View className="h-[22px] w-[22px] items-center justify-center rounded-full bg-brand">
          <Check size={12} color="#fff" strokeWidth={3} />
        </View>
      ) : (
        <View className={`h-[22px] w-[22px] rounded-full border-2 ${active ? 'border-brand' : 'border-line'}`} />
      )}
      <View className="flex-1">
        <Text className={`font-heavy text-[13.5px] ${muted ? 'text-muted-soft' : 'text-ink'}`}>{label}</Text>
        <Text className="font-med text-[12.5px] text-muted-soft">{note}</Text>
      </View>
    </View>
  );
}
