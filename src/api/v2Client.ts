import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { getApiConfig } from '@/config/api';

/**
 * Builds the absolute URL for a V2 API request.
 *
 * @param {string} path - The endpoint path without the leading base URL.
 * @returns {string} The absolute URL for the request.
 */
function buildUrl(path: string): string {
  const config = getApiConfig();
  const basePath = (config.basePath ?? '').replace(/\/+$/, '');
  const trimmedPath = path.replace(/^\/+/, '');
  return `${basePath}/${trimmedPath}`;
}

/**
 * Builds the Axios configuration shared by all V2 requests.
 *
 * @param {AxiosRequestConfig} [override] - Optional overrides for the request.
 * @returns {AxiosRequestConfig} The Axios configuration with headers and overrides merged.
 */
function buildRequestConfig(override?: AxiosRequestConfig): AxiosRequestConfig {
  const config = getApiConfig();
  const baseHeaders = (config.baseOptions?.headers ?? {}) as Record<string, string>;
  const headers = {
    'Content-Type': 'application/json',
    ...baseHeaders,
    ...override?.headers,
  };
  return {
    ...override,
    headers,
  };
}

/**
 * Sends a POST request to a V2 API endpoint.
 *
 * @param {string} path - The endpoint path relative to the API base URL.
 * @param {unknown} payload - The request payload.
 * @param {AxiosRequestConfig} [config] - Optional Axios configuration overrides.
 * @returns {Promise<AxiosResponse<T>>} The Axios response promise.
 */
export function postV2<T>(
  path: string,
  payload: unknown,
  config?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> {
  const url = buildUrl(path);
  return axios.post<T>(url, payload, buildRequestConfig(config));
}

/**
 * Sends a GET request to a V2 API endpoint.
 *
 * @param {string} path - The endpoint path relative to the API base URL.
 * @param {AxiosRequestConfig} [config] - Optional Axios configuration overrides.
 * @returns {Promise<AxiosResponse<T>>} The Axios response promise.
 */
export function getV2<T>(path: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  const url = buildUrl(path);
  return axios.get<T>(url, buildRequestConfig(config));
}
