import { apiRequest } from './client';
import type { AuthResponse, User } from '../types';

export const login = (email: string, password: string) =>
  apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password },
  });

export const getMe = () => apiRequest<{ user: User } | User>('/auth/me');

export interface DriverRegistrationPayload {
  name: string;
  email: string;
  password: string;
  contactNumber: string;
  address: string;
  description: string;
  experienceYears: number;
}

// When admin auto-approval is on, the API returns a session (token + user) so the app can
// open straight to the overview; otherwise it returns just a message (pending review).
export const registerDriver = (payload: DriverRegistrationPayload) =>
  apiRequest<{ message: string; token?: string; user?: User }>('/auth/register', {
    method: 'POST',
    auth: false,
    body: { ...payload, role: 'driver' },
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
