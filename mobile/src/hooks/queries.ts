import { useQuery } from '@tanstack/react-query';
import * as driverApi from '../api/driver';
import * as bookingApi from '../api/bookings';
import * as chatApi from '../api/chat';
import * as briefApi from '../api/briefs';
import { asList } from '../lib/format';
import type {
  DriverOverview,
  Booking,
  Conversation,
  ChatMessage,
  Brief,
  Vehicle,
  EarningsSummary,
  EarningsHistoryEntry,
} from '../types';

export const qk = {
  overview: ['overview'] as const,
  bookings: ['bookings'] as const,
  conversations: ['conversations'] as const,
  messages: (id: string) => ['messages', id] as const,
  briefs: ['briefs'] as const,
  vehicles: ['vehicles'] as const,
  earningsSummary: (month?: string) => ['earnings', 'summary', month ?? 'current'] as const,
  earningsHistory: ['earnings', 'history'] as const,
};

export const useOverview = () =>
  useQuery<DriverOverview>({ queryKey: qk.overview, queryFn: driverApi.getOverview });

export const useBookings = () =>
  useQuery<Booking[]>({
    queryKey: qk.bookings,
    queryFn: async () => asList<Booking>(await bookingApi.getDriverBookings(), 'bookings'),
  });

export const useConversations = () =>
  useQuery<Conversation[]>({
    queryKey: qk.conversations,
    queryFn: async () => asList<Conversation>(await chatApi.getConversations(), 'conversations'),
  });

export const useMessages = (conversationId: string) =>
  useQuery<{ messages: ChatMessage[]; booking: Booking | null }>({
    queryKey: qk.messages(conversationId),
    queryFn: async () => {
      const res = (await chatApi.getMessages(conversationId)) as
        | { messages?: ChatMessage[]; booking?: Booking | null }
        | ChatMessage[];
      return {
        messages: asList<ChatMessage>(res, 'messages'),
        booking: (Array.isArray(res) ? null : res?.booking) ?? null,
      };
    },
    enabled: Boolean(conversationId),
    refetchInterval: 8000,
  });

export const useBriefs = () =>
  useQuery<Brief[]>({
    queryKey: qk.briefs,
    queryFn: async () => asList<Brief>(await briefApi.getOpenBriefs(), 'briefs'),
  });

export const useVehicles = () =>
  useQuery<Vehicle[]>({
    queryKey: qk.vehicles,
    queryFn: async () => asList<Vehicle>(await driverApi.getVehicles(), 'vehicles'),
  });

export const useEarningsSummary = (month?: string) =>
  useQuery<EarningsSummary>({
    queryKey: qk.earningsSummary(month),
    queryFn: () => driverApi.getEarningsSummary(month),
  });

export const useEarningsHistory = () =>
  useQuery<EarningsHistoryEntry[]>({
    queryKey: qk.earningsHistory,
    queryFn: async () =>
      asList<EarningsHistoryEntry>(await driverApi.getEarningsHistory(), 'history'),
  });
