import { useState, useCallback } from 'react';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends ApiState<T> {
  execute: (config: AxiosRequestConfig) => Promise<T | null>;
  reset: () => void;
}

export function useApi<T = any>(): UseApiReturn<T> {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (config: AxiosRequestConfig): Promise<T | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const api = axios.create({
        baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
        headers: {
          "X-User": localStorage.getItem("username") || "",
          ...config.headers,
        },
      });

      const response: AxiosResponse<T> = await api(config);
      setState({ data: response.data, loading: false, error: null });
      return response.data;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error.message || 'An error occurred';
      setState({ data: null, loading: false, error: errorMessage });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}