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

export async function uploadFile<T = unknown>(
  path: string,
  fileUri: string,
  fieldName = 'file',
): Promise<ApiResponse<T>> {
  const url = `${Config.API_URL}${path}`;

  const fileName = fileUri.split('/').pop() ?? 'photo.jpg';
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  const formData = new FormData();
  formData.append(fieldName, {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as any);

  const headers: Record<string, string> = {};
  const token = useAuthStore.getState().token;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  const responseData = await response.json();

  return {
    data: responseData as T,
    status: response.status,
    message: responseData['message'],
  };
}