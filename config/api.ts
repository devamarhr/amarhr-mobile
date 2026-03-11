import { Config } from './config';
import { useAuthStore } from '@/store/auth-store';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ApiOptions {
  path: string;
  method?: Method;
  data?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
}

interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  message: string;
}

export async function api<T = unknown>({
  path,
  method = 'GET',
  data,
  headers,
  auth = true,
}: ApiOptions): Promise<ApiResponse<T>> {
  const url = `${Config.API_URL}${path}`;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (auth) {
    const token = useAuthStore.getState().token;
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: data ? JSON.stringify(data) : undefined,
  });

  const responseData = await response.json();

  return {
    data: responseData as T,
    status: response.status,
    message: responseData['message'],
  };
}