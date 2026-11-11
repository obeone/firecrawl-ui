import axios, { type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';

/**
 * A request seen by the stubbed adapter.
 */
export interface RecordedRequest {
  method: string;
  url: string;
  baseURL?: string;
  headers: Record<string, unknown>;
  data?: unknown;
}

/**
 * A canned response, keyed by absolute URL (base URL + path, query string included).
 */
export interface StubResponse {
  status?: number;
  data: unknown;
}

/**
 * Replace the default axios adapter so every instance created afterwards
 * answers from `routes` instead of the network.
 *
 * Unknown URLs answer 404 so a test never reaches a real server.
 *
 * @param routes - Map of absolute URL to canned response.
 * @returns The list of requests made, and a `restore` function.
 */
export function stubHttp(routes: Record<string, StubResponse>) {
  const requests: RecordedRequest[] = [];
  const previous = axios.defaults.adapter;

  const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    const absolute = axios.getUri(config);
    requests.push({
      method: (config.method ?? 'get').toUpperCase(),
      url: absolute,
      baseURL: config.baseURL,
      headers: { ...(config.headers?.toJSON?.() ?? config.headers) },
      data: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
    });
    const route = routes[absolute] ?? { status: 404, data: { success: false, error: 'Not found' } };
    const status = route.status ?? 200;
    const response = { data: route.data, status, statusText: String(status), headers: {}, config };
    if (status >= 400) {
      throw new axios.AxiosError(
        `Request failed with status code ${status}`,
        status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST',
        config,
        null,
        response,
      );
    }
    return response;
  };

  axios.defaults.adapter = adapter;
  return {
    requests,
    restore() {
      axios.defaults.adapter = previous;
    },
  };
}
