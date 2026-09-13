/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

// 1. Resolve Base URL dynamically (Absolute for SSR, Relative for Client)
const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') return '/api'; // Client-side relative path
  if (process.env.NEXT_PUBLIC_APP_URL) return `${process.env.NEXT_PUBLIC_APP_URL}/api`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}/api`;
  return `http://localhost:${process.env.PORT || 3000}/api`; // Local SSR fallback
};

// 2. Create Axios Instance
export const api: AxiosInstance = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// 3. Request Interceptor: Forward session cookies when executing on the server
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    // If running on the server (SSR / Server Components), attach incoming request cookies
    if (typeof window === 'undefined') {
      try {
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        const cookieString = cookieStore.toString();

        if (cookieString && config.headers) {
          config.headers.set('Cookie', cookieString);
        }
      } catch {
        // Silently handle invocation outside Next.js request contexts
      }
    }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// 4. Response Interceptor: Automatically unwrap response.data and type errors
api.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error: unknown) => {
    let message = 'An unexpected error occurred';

    if (axios.isAxiosError(error) && error.response?.data) {
      const data = error.response.data as { error?: string; message?: string };
      message = data.error || data.message || error.message;
    } else if (error instanceof Error) {
      message = error.message;
    }

    return Promise.reject(new Error(message));
  },
);

// 5. Clean, Fully Typed API Client Interface
export interface ApiClient {
  get: <T>(url: string, params?: Record<string, any>, config?: AxiosRequestConfig) => Promise<T>;
  delete: <T>(url: string, params?: Record<string, any>, config?: AxiosRequestConfig) => Promise<T>;
  post: <T>(url: string, payload?: unknown, config?: AxiosRequestConfig) => Promise<T>;
  put: <T>(url: string, payload?: unknown, config?: AxiosRequestConfig) => Promise<T>;
  patch: <T>(url: string, payload?: unknown, config?: AxiosRequestConfig) => Promise<T>;
}

export const apiClient: ApiClient = {
  get: <T>(url: string, params?: Record<string, any>, config?: AxiosRequestConfig): Promise<T> =>
    api.get(url, { params, ...config }) as Promise<T>,

  post: <T>(url: string, payload?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    api.post(url, payload, config) as Promise<T>,

  put: <T>(url: string, payload?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    api.put(url, payload, config) as Promise<T>,

  patch: <T>(url: string, payload?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    api.patch(url, payload, config) as Promise<T>,

  delete: <T>(url: string, params?: Record<string, any>, config?: AxiosRequestConfig): Promise<T> =>
    api.delete(url, { params, ...config }) as Promise<T>,
};
