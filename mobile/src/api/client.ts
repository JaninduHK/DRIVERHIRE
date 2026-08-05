import { getAuthToken, triggerUnauthorized } from '../lib/session';

const DEFAULT_API_URL = 'https://carwithdriver.lk/api';

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');

// Origin (without the /api suffix) for resolving relative asset paths returned by the backend.
export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const parseError = async (response: Response): Promise<string> => {
  try {
    const data = await response.json();
    if (Array.isArray(data?.errors) && data.errors.length > 0) {
      return data.errors.map((e: { msg?: string; message?: string }) => e.msg || e.message).join('\n');
    }
    if (typeof data?.message === 'string') {
      return data.message;
    }
    return 'Unexpected server error';
  } catch {
    return 'Unable to reach the server. Check your connection and try again.';
  }
};

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | object | null;
  auth?: boolean;
}

export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, headers: customHeaders, ...rest } = options;

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const isJsonBody = body != null && !isFormData;

  const token = auth ? getAuthToken() : null;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((customHeaders as Record<string, string>) || {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers,
    body: isFormData ? (body as FormData) : isJsonBody ? JSON.stringify(body) : (body as BodyInit | null | undefined),
  });

  if (!response.ok) {
    const message = await parseError(response);
    if (response.status === 401) {
      triggerUnauthorized();
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return null as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

// Resolve possibly-relative asset paths (profile photos, vehicle images) to absolute URLs.
export const resolveAssetUrl = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_ORIGIN}${value.startsWith('/') ? '' : '/'}${value}`;
};
