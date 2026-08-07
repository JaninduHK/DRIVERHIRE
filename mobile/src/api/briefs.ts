import { apiRequest } from './client';
import type { Brief } from '../types';

export const getOpenBriefs = () => apiRequest<{ briefs: Brief[] } | Brief[]>('/briefs');

export interface BriefResponsePayload {
  vehicleId: string;
  totalPrice: number;
  totalKms: number;
  pricePerExtraKm: number;
  note?: string;
  message?: string;
  startDate?: string;
  endDate?: string;
}

export const respondToBrief = (briefId: string, payload: BriefResponsePayload) =>
  apiRequest(`/briefs/${briefId}/respond`, { method: 'POST', body: payload });
