import { useAuthStore } from '@/store/auth-store';
import { Config } from './config';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// A hung connection (server accepts the socket but never responds) leaves a
// bare `fetch` pending forever, which permanently freezes any screen whose
// loading/isFetching flag is only cleared in the request's `.finally`. Abort
// after this timeout so those flags always reset and the screen can recover.
const DEFAULT_TIMEOUT_MS = 20000;

interface ApiOptions {
  path: string;
  method?: Method;
  data?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
  timeoutMs?: number;
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
  timeoutMs = DEFAULT_TIMEOUT_MS,
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: data ? JSON.stringify(data) : undefined,
      signal: controller.signal,
    });

    const responseData = await response.json();

    if (response.status === 401 && auth) {
      useAuthStore.getState().logout();
    }

    return {
      data: responseData as T,
      status: response.status,
      message: responseData['message'],
    };
  } catch {
    // Includes the AbortError thrown on timeout — treated as a connection error.
    return {
      data: {} as T,
      status: 0,
      message: 'Connection error',
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function uploadFile<T = unknown>(
  path: string,
  fileUri: string,
  fieldName = 'file',
  timeoutMs = 60000,
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    });

    const responseData = await response.json();

    return {
      data: responseData as T,
      status: response.status,
      message: responseData['message'],
    };
  } catch {
    return {
      data: {} as T,
      status: 0,
      message: 'Сүлжээний алдаа гарлаа',
    };
  } finally {
    clearTimeout(timer);
  }
}