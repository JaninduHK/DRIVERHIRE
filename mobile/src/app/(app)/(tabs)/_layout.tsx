import { View, Text, Pressable } from 'react-native';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, CalendarDays, MessageSquare, User, type LucideIcon } from 'lucide-react-native';
import { useConversations } from '../../../hooks/queries';
import { colors } from '../../../theme/colors';
import { Badge } from '../../../components/Badge';

const ITEMS: { name: string; label: string; Icon: LucideIcon }[] = [
  { name: 'index', label: 'Home', Icon: Home },
  { name: 'bookings', label: 'Bookings', Icon: CalendarDays },
  { name: 'messages', label: 'Chats', Icon: MessageSquare },
  { name: 'profile', label: 'Profile', Icon: User },
];

function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { data: conversations } = useConversations();
  const unread = (conversations ?? []).reduce((n, c) => n + (c.unreadCount ?? 0), 0);
  const activeName = state.routes[state.index]?.name;

  return (
    <View
      style={{ paddingBottom: (insets.bottom || 12) + 2 }}
      className="flex-row justify-around border-t border-[#eef1f0] bg-white px-2.5 pt-2.5"
    >
      {ITEMS.map(({ name, label, Icon }) => {
        const focused = activeName === name;
        const color = focused ? colors.brand : colors.mutedSoft;
        const showBadge = name === 'messages' && unread > 0;
        return (
          <Pressable
            key={name}
            className="flex-1 items-center gap-[3px] py-0.5"
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: name, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(name);
            }}
          >
            <View>
              <Icon size={21} color={color} strokeWidth={1.9} />
              {showBadge ? (
                <View className="absolute -right-2.5 -top-1.5">
                  <Badge count={unread} />
                </View>
              ) : null}
            </View>
            <Text
              style={{ color }}
              className={`text-[10.5px] ${focused ? 'font-xheavy' : 'font-heavy'}`}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="bookings" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
