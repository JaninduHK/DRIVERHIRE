import { apiRequest } from './client';
import type { Conversation, ChatMessage, Offer } from '../types';

export const getConversations = () =>
  apiRequest<{ conversations: Conversation[] } | Conversation[]>('/chat/conversations');

export const getMessages = (conversationId: string) =>
  apiRequest<{ messages: ChatMessage[] } | ChatMessage[]>(
    `/chat/conversations/${conversationId}/messages`
  );

export const sendMessage = (conversationId: string, body: string) =>
  apiRequest<{ message: ChatMessage }>(`/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: { body },
  });

export interface OfferPayload {
  totalPrice: number;
  includedKm?: number;
  extraKmRate?: number;
  vehicleId?: string;
  note?: string;
  startDate?: string;
  endDate?: string;
}

export const sendOffer = (conversationId: string, payload: OfferPayload) =>
  apiRequest<{ offer: Offer }>(`/chat/conversations/${conversationId}/offers`, {
    method: 'POST',
    body: payload,
  });

export const markConversationRead = (conversationId: string) =>
  apiRequest(`/chat/conversations/${conversationId}/read`, { method: 'POST' });

export const getOffer = (offerId: string) => apiRequest<Offer>(`/chat/offers/${offerId}`);
