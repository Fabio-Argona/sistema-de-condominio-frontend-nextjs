'use client';

import { useState, useCallback } from 'react';
import { AxiosError, AxiosRequestConfig } from 'axios';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface UseApiOptions {
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
}

interface ApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

export function useApi<T = unknown>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const execute = useCallback(
    async (
      method: 'get' | 'post' | 'put' | 'delete' | 'patch',
      url: string,
      data?: unknown,
      options?: UseApiOptions & AxiosRequestConfig
    ): Promise<T | null> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      
      const { showSuccessToast = false, showErrorToast = true, successMessage, ...axiosConfig } = options || {};

      try {
        const response = await api.request<T>({
          method,
          url,
          data,
          ...axiosConfig,
        });

        setState({ data: response.data, isLoading: false, error: null });

        if (showSuccessToast) {
          toast.success(successMessage || 'Operação realizada com sucesso!');
        }

        return response.data;
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>;
        const errorMessage =
          axiosError.response?.data?.message ||
          axiosError.message ||
          'Erro inesperado. Tente novamente.';

        setState({ data: null, isLoading: false, error: errorMessage });

        if (showErrorToast) {
          toast.error(errorMessage);
        }

        return null;
      }
    },
    []
  );

  const get = useCallback(
    (url: string, options?: UseApiOptions & AxiosRequestConfig) =>
      execute('get', url, undefined, options),
    [execute]
  );

  const post = useCallback(
    (url: string, data?: unknown, options?: UseApiOptions & AxiosRequestConfig) =>
      execute('post', url, data, options),
    [execute]
  );

  const put = useCallback(
    (url: string, data?: unknown, options?: UseApiOptions & AxiosRequestConfig) =>
      execute('put', url, data, options),
    [execute]
  );

  const patch = useCallback(
    (url: string, data?: unknown, options?: UseApiOptions & AxiosRequestConfig) =>
      execute('patch', url, data, options),
    [execute]
  );

  const del = useCallback(
    (url: string, options?: UseApiOptions & AxiosRequestConfig) =>
      execute('delete', url, undefined, options),
    [execute]
  );

  return {
    ...state,
    get,
    post,
    put,
    patch,
    del,
    execute,
  };
}
