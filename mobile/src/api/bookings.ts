import { apiRequest } from './client';
import type { Booking } from '../types';

export const getDriverBookings = () =>
  apiRequest<{ bookings: Booking[] } | Booking[]>('/bookings/driver');

// The backend expects { action: 'accept' | 'reject' } (driverRespondToBooking).
export const respondToBooking = (bookingId: string, action: 'accept' | 'reject') =>
  apiRequest<{ booking: Booking }>(`/bookings/${bookingId}/status`, {
    method: 'PATCH',
    body: { action },
  });
