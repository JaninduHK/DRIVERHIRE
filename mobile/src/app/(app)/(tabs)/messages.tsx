import { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import { Screen } from '../../../components/Screen';
import { AppHeader } from '../../../components/AppHeader';
import { BodySheet } from '../../../components/BodySheet';
import { Card } from '../../../components/Card';
import { Avatar } from '../../../components/Avatar';
import { Divider } from '../../../components/Divider';
import { Badge } from '../../../components/Badge';
import { Loading, EmptyState } from '../../../components/states';
import { useConversations } from '../../../hooks/queries';
import { relativeTime } from '../../../lib/format';
import { colors } from '../../../theme/colors';
import type { Conversation } from '../../../types';

const nameOf = (c: Conversation) => c.participantName || c.traveler?.name || 'Traveller';
const previewOf = (c: Conversation) => c.lastMessage?.body || c.lastMessagePreview || c.subtitle || 'Start the conversation';

export default function Messages() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { data, isLoading, isRefetching, refetch } = useConversations();

  const filtered = useMemo(() => {
    const list = data ?? [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((c) => nameOf(c).toLowerCase().includes(q) || previewOf(c).toLowerCase().includes(q));
  }, [data, query]);

  return (
    <Screen>
      <AppHeader eyebrow="INBOX" title="Messages" />
      <BodySheet onRefresh={refetch} refreshing={isRefetching}>
        <View className="mb-3.5 flex-row items-center gap-2 rounded-xl border-[1.5px] border-line bg-white px-3 py-3">
          <Search size={16} color={colors.mutedSoft} strokeWidth={1.8} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search conversations"
            placeholderTextColor={colors.placeholder}
            className="flex-1 font-med text-[13.5px] text-ink"
          />
        </View>

        {isLoading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <Card className="p-5">
            <EmptyState
              title={query ? 'No matches' : 'No conversations yet'}
              subtitle={query ? 'Try a different search.' : 'When a traveller messages you, it appears here.'}
            />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            {filtered.map((c, i) => {
              const unread = c.unreadCount ?? 0;
              return (
                <View key={c.id}>
                  {i > 0 ? <Divider /> : null}
                  <Pressable
                    onPress={() => router.push(`/(app)/chat/${c.id}`)}
                    className={`flex-row items-center gap-3 p-3.5 ${unread > 0 ? 'bg-[#f3fbf6]' : 'active:bg-hairline'}`}
                  >
                    <Avatar name={nameOf(c)} uri={c.traveler?.profilePhoto} size={44} rounded={12} />
                    <View className="min-w-0 flex-1">
                      <View className="flex-row items-center justify-between">
                        <Text className="font-heavy text-[14.5px] text-ink" numberOfLines={1}>
                          {nameOf(c)}
                        </Text>
                        <Text className="ml-2 font-med text-[11px] text-muted-soft">
                          {relativeTime(c.updatedAt || c.lastMessage?.createdAt)}
                        </Text>
                      </View>
                      <Text
                        className={`text-[12.5px] ${unread > 0 ? 'font-semi text-ink-soft' : 'font-med text-muted-soft'}`}
                        numberOfLines={1}
                      >
                        {previewOf(c)}
                      </Text>
                    </View>
                    {unread > 0 ? <Badge count={unread} tone="brand" /> : null}
                  </Pressable>
                </View>
              );
            })}
          </Card>
        )}
      </BodySheet>
    </Screen>
  );
}
