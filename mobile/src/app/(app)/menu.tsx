import { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, type Href } from 'expo-router';
import {
  X,
  LogOut,
  User,
  Car,
  CalendarDays,
  MessageCircle,
  MapPin,
  DollarSign,
  CalendarCheck,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react-native';
import { useAuth } from '../../auth/AuthContext';
import { useConversations } from '../../hooks/queries';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { colors } from '../../theme/colors';

const logo = require('../../../assets/logo.png');

type NavItem = { id: string; label: string; href: Href; icon: LucideIcon; badge?: 'messages' };

const NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', href: '/(app)/(tabs)', icon: User },
  { id: 'vehicles', label: 'My Vehicles', href: '/(app)/vehicles', icon: Car },
  { id: 'bookings', label: 'My Bookings', href: '/(app)/(tabs)/bookings', icon: CalendarDays },
  { id: 'messages', label: 'Messages', href: '/(app)/(tabs)/messages', icon: MessageCircle, badge: 'messages' },
  { id: 'briefs', label: 'Tour Briefs', href: '/(app)/briefs', icon: MapPin },
  { id: 'earnings', label: 'My Earnings', href: '/(app)/earnings', icon: DollarSign },
  { id: 'availability', label: 'My Availability', href: '/(app)/availability', icon: CalendarCheck },
  { id: 'profile', label: 'My Profile', href: '/(app)/(tabs)/profile', icon: ClipboardList },
];

export default function Menu() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { data: conversations } = useConversations();
  const unread = (conversations ?? []).reduce((n, c) => n + (c.unreadCount ?? 0), 0);

  const slide = useRef(new Animated.Value(-300)).current;
  useEffect(() => {
    Animated.timing(slide, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slide]);

  const go = (href: Href) => router.replace(href);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/welcome');
  };

  return (
    <View className="flex-1">
      <StatusBar style="light" />
      {/* Scrim */}
      <Pressable className="absolute inset-0 bg-ink/45" onPress={() => router.back()} />

      {/* Left slide-in panel */}
      <Animated.View style={{ transform: [{ translateX: slide }] }} className="h-full w-[290px]">
        <View className="h-full rounded-r-[28px] bg-white" style={{ shadowColor: '#0f1f2d', shadowOpacity: 0.2, shadowRadius: 40, shadowOffset: { width: 12, height: 0 }, elevation: 16 }}>
          <SafeAreaView edges={['top', 'bottom']} className="flex-1 px-5">
            <View className="mb-3 mt-2 flex-row items-center justify-between">
              <Pressable onPress={() => go('/(app)/(tabs)')} accessibilityLabel="Go to home">
                <Image source={logo} style={{ height: 40, width: 132 }} contentFit="contain" />
              </Pressable>
              <Pressable onPress={() => router.back()} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-xl bg-canvas">
                <X size={16} color={colors.ink} strokeWidth={2} />
              </Pressable>
            </View>

            {/* User card */}
            <View className="mb-1 flex-row items-center gap-3 rounded-2xl bg-canvas p-3">
              <Avatar name={user?.name} uri={user?.profilePhoto} size={44} rounded={12} />
              <View className="min-w-0 flex-1">
                <Text className="font-heavy text-[15px] text-ink" numberOfLines={1}>
                  {user?.name || 'Driver'}
                </Text>
                <Text className="font-heavy text-[12px] text-brand" numberOfLines={1}>
                  Approved driver
                </Text>
              </View>
            </View>

            {/* Nav */}
            <View className="mt-3 flex-1 gap-0.5">
              {NAV.map((item) => {
                const Icon = item.icon;
                const showBadge = item.badge === 'messages' && unread > 0;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => go(item.href)}
                    className="flex-row items-center justify-between rounded-xl px-3 py-3 active:bg-canvas"
                  >
                    <View className="flex-row items-center gap-3">
                      <Icon size={18} color={colors.muted} strokeWidth={1.8} />
                      <Text className="font-semi text-[14px] text-ink-soft">{item.label}</Text>
                    </View>
                    {showBadge ? <Badge count={unread} /> : null}
                  </Pressable>
                );
              })}
            </View>

            {/* Logout */}
            <Pressable
              onPress={handleLogout}
              className="mb-1 flex-row items-center gap-2.5 rounded-xl border border-line bg-white px-3 py-3 active:bg-hairline"
            >
              <LogOut size={17} color={colors.danger} strokeWidth={2} />
              <Text className="font-heavy text-[14px] text-danger">Logout</Text>
            </Pressable>
          </SafeAreaView>
        </View>
      </Animated.View>
    </View>
  );
}
