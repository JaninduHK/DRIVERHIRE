import { apiRequest } from './client';
import type { Booking } from '../types';

export const getDriverBookings = () =>
  apiRequest<{ bookings: Booking[] } | Booking[]>('/bookings/driver');

// status: 'accepted' | 'rejected' (backend driverRespondToBooking)
export const respondToBooking = (bookingId: string, status: string) =>
  apiRequest<{ booking: Booking }>(`/bookings/${bookingId}/status`, {
    method: 'PATCH',
    body: { status },
  });
