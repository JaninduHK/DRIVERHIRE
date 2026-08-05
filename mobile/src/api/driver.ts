import { apiRequest } from './client';
import type { DriverOverview, Vehicle, EarningsSummary, EarningsHistoryEntry } from '../types';

export const getOverview = () => apiRequest<DriverOverview>('/driver/overview');

export const getVehicles = () =>
  apiRequest<{ vehicles: Vehicle[] } | Vehicle[]>('/driver/vehicles');

export const createVehicle = (form: FormData) =>
  apiRequest<{ vehicle: Vehicle }>('/driver/vehicles', { method: 'POST', body: form });

export const updateVehicle = (id: string, form: FormData) =>
  apiRequest<{ vehicle: Vehicle }>(`/driver/vehicles/${id}`, { method: 'PATCH', body: form });

export interface AvailabilityBlock {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  note?: string;
}

export const getVehicleAvailability = (vehicleId: string) =>
  apiRequest<{ availability: AvailabilityBlock[] } | AvailabilityBlock[]>(
    `/driver/vehicles/${vehicleId}/availability`
  );

export const createVehicleAvailability = (
  vehicleId: string,
  payload: { startDate: string; endDate: string; status?: string; note?: string }
) =>
  apiRequest(`/driver/vehicles/${vehicleId}/availability`, {
    method: 'POST',
    body: payload,
  });

export const deleteVehicleAvailability = (vehicleId: string, availabilityId: string) =>
  apiRequest(`/driver/vehicles/${vehicleId}/availability/${availabilityId}`, {
    method: 'DELETE',
  });

export const getEarningsSummary = (month?: string) =>
  apiRequest<EarningsSummary>(
    `/driver/earnings/summary${month ? `?month=${encodeURIComponent(month)}` : ''}`
  );

export const getEarningsHistory = () =>
  apiRequest<{ history: EarningsHistoryEntry[] } | EarningsHistoryEntry[]>('/driver/earnings/history');

export const uploadCommissionSlip = (commissionId: string, form: FormData) =>
  apiRequest(`/driver/earnings/${commissionId}/payment-slip`, { method: 'POST', body: form });

// Push token registration (backend endpoints added in the backend phase).
export const registerPushToken = (token: string) =>
  apiRequest('/driver/push-token', { method: 'POST', body: { token } });

export const unregisterPushToken = (token: string) =>
  apiRequest('/driver/push-token', { method: 'DELETE', body: { token } });
