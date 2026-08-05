import { apiRequest } from './client';
import type { Brief } from '../types';

export const getOpenBriefs = () => apiRequest<{ briefs: Brief[] } | Brief[]>('/briefs');

export interface BriefResponsePayload {
  totalPrice?: number;
  message?: string;
  note?: string;
  vehicleId?: string;
}

export const respondToBrief = (briefId: string, payload: BriefResponsePayload) =>
  apiRequest(`/briefs/${briefId}/respond`, { method: 'POST', body: payload });
