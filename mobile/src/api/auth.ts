import { apiRequest } from './client';
import type { AuthResponse, User } from '../types';

export const login = (email: string, password: string) =>
  apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password },
  });

export const getMe = () => apiRequest<{ user: User } | User>('/auth/me');

export const refreshSession = (refreshToken: string) =>
  apiRequest<AuthResponse>('/auth/refresh', {
    method: 'POST',
    auth: false,
    body: { refreshToken },
  });

export const logoutSession = (refreshToken?: string | null) =>
  apiRequest<{ success: boolean }>('/auth/logout', {
    method: 'POST',
    auth: false,
    body: { refreshToken },
  });

export interface DriverRegistrationPayload {
  name: string;
  email: string;
  password: string;
  contactNumber: string;
  address: string;
  description: string;
  experienceYears: number;
}

// FormData: registration now requires a profile photo + a license type/photo up front
// (see backend/controllers/authController.js), so this is always multipart, never JSON.
export const registerDriver = (form: FormData) =>
  apiRequest<{ message: string; token?: string; refreshToken?: string; user?: User }>('/auth/register', {
    method: 'POST',
    auth: false,
    body: form,
  });

export const requestPasswordReset = (email: string) =>
  apiRequest<{ message: string }>('/auth/password/reset/request', {
    method: 'POST',
    auth: false,
    body: { email },
  });

export const resetPassword = (token: string, password: string) =>
  apiRequest<{ message: string }>('/auth/password/reset/confirm', {
    method: 'POST',
    auth: false,
    body: { token, password },
  });

export const updateProfile = (form: FormData) =>
  apiRequest<{ user: User } | User>('/auth/profile', {
    method: 'PUT',
    body: form,
  });

export const updatePassword = (currentPassword: string, password: string) =>
  apiRequest<{ message: string }>('/auth/password', {
    method: 'PUT',
    body: { currentPassword, password },
  });

// Erases the driver's personal data and ends the session. The account row itself is
// kept in anonymised form because bookings, reviews and commission records all
// reference it — see backend/services/accountDeletionService.js.
export const deleteOwnAccount = (password?: string) =>
  apiRequest<{ message: string; deletedAt: string }>('/auth/account', {
    method: 'DELETE',
    body: password ? { password } : {},
  });
