/**
 * Enhanced API client with retry logic, error handling, and request/response interceptors
 * Provides robust HTTP communication for SkillSync platform
 */

import { fetchWithRetry, SkillSyncError, RetryOptions } from './error-handling';
import { logger } from './logging';

export interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  retryOptions?: RetryOptions;
  defaultHeaders?: Record<string, string>;
  interceptors?: {
    request?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
    response?: (response: Response) => Response | Promise<Response>;
    error?: (error: Error) => Error | Promise<Error>;
  };
}

export interface RequestConfig extends RequestInit {
  url: string;
  timeout?: number;
  retryOptions?: RetryOptions;
  skipRetry?: boolean;
  skipLogging?: boolean;
  metadata?: Record<string, any>;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  config: RequestConfig;
}

export interface ApiError extends SkillSyncError {
  status?: number;
  response?: Response;
  config?: RequestConfig;
}

class ApiClient {
  private config: Required<ApiClientConfig>;
  private abortControllers = new Map<string, AbortController>();

  constructor(config: ApiClientConfig = {}) {
    this.config = {
      baseURL: config.baseURL || '/api',
      timeout: config.timeout || 30000,
      retryOptions: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        ...config.retryOptions
      },
      defaultHeaders: {
        'Content-Type': 'application/json',
        ...config.defaultHeaders
      },
      interceptors: config.interceptors || {}
    };
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      ...config,
      url,
      method: 'GET'
    });
  }

  /**
   * POST request
   */
  async post<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      ...config,
      url,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      ...config,
      url,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      ...config,
      url,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      ...config,
      url,
      method: 'DELETE'
    });
  }

  /**
   * Upload file
   */
  async upload<T = any>(url: string, file: File | FormData, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    const formData = file instanceof FormData ? file : new FormData();
    if (file instanceof File) {
      formData.append('file', file);
    }

    return this.request<T>({
      ...config,
      url,
      method: 'POST',
      body: formData,
      headers: {
        // Remove Content-Type to let browser set it with boundary
        ...this.config.defaultHeaders,
        ...config?.headers,
        'Content-Type': undefined
      } as any
    });
  }

  /**
   * Core request method
   */
  async request<T = any>(config: RequestConfig): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Apply request interceptor
      const processedConfig = await this.applyRequestInterceptor(config);

      // Build full URL
      const fullUrl = this.buildUrl(processedConfig.url);

      // Setup abort controller for timeout
      const abortController = new AbortController();
      this.abortControllers.set(requestId, abortController);

      // Setup timeout
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, processedConfig.timeout || this.config.timeout);

      // Prepare request options
      const requestOptions: RequestInit = {
        ...processedConfig,
        headers: {
          ...this.config.defaultHeaders,
          ...processedConfig.headers
        },
        signal: abortController.signal
      };

      // Log request start
      if (!processedConfig.skipLogging) {
        logger.debug(`API Request: ${processedConfig.method} ${fullUrl}`, {
          component: 'ApiClient',
          action: 'request_start',
          metadata: {
            requestId,
            method: processedConfig.method,
            url: fullUrl,
            ...processedConfig.metadata
          }
        });
      }

      // Make request with retry logic
      const response = processedConfig.skipRetry
        ? await fetch(fullUrl, requestOptions)
        : await fetchWithRetry(fullUrl, requestOptions, {
          ...this.config.retryOptions,
          ...processedConfig.retryOptions,
          onRetry: (attempt, error) => {
            logger.warn(`API Request retry ${attempt}`, undefined, {
              requestId,
              method: processedConfig.method,
              url: fullUrl,
              error: error.message
            });
          }
        });

      // Clear timeout and abort controller
      clearTimeout(timeoutId);
      this.abortControllers.delete(requestId);

      // Apply response interceptor
      const processedResponse = await this.applyResponseInterceptor(response);

      // Parse response data
      const data = await this.parseResponse<T>(processedResponse);

      const duration = Date.now() - startTime;

      // Log successful request
      if (!processedConfig.skipLogging) {
        logger.apiCall(
          processedConfig.method || 'GET',
          fullUrl,
          duration,
          processedResponse.status
        );
      }

      return {
        data,
        status: processedResponse.status,
        statusText: processedResponse.statusText,
        headers: processedResponse.headers,
        config: processedConfig
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.abortControllers.delete(requestId);

      // Apply error interceptor
      const processedError = await this.applyErrorInterceptor(error as Error);

      // Create API error
      const apiError = this.createApiError(processedError, config, duration);

      // Log error
      if (!config.skipLogging) {
        logger.apiCall(
          config.method || 'GET',
          this.buildUrl(config.url),
          duration,
          apiError.status,
          apiError
        );
      }

      throw apiError;
    }
  }

  /**
   * Cancel request by ID
   */
  cancelRequest(requestId: string): void {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    for (const [id, controller] of this.abortControllers) {
      controller.abort();
    }
    this.abortControllers.clear();
  }

  /**
   * Update default configuration
   */
  updateConfig(config: Partial<ApiClientConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      defaultHeaders: {
        ...this.config.defaultHeaders,
        ...config.defaultHeaders
      },
      retryOptions: {
        ...this.config.retryOptions,
        ...config.retryOptions
      },
      interceptors: {
        ...this.config.interceptors,
        ...config.interceptors
      }
    };
  }

  /**
   * Set authorization header
   */
  setAuthToken(token: string): void {
    this.updateConfig({
      defaultHeaders: {
        ...this.config.defaultHeaders,
        Authorization: `Bearer ${token}`
      }
    });
  }

  /**
   * Remove authorization header
   */
  clearAuthToken(): void {
    const { Authorization, ...headers } = this.config.defaultHeaders;
    this.updateConfig({ defaultHeaders: headers });
  }

  /**
   * Private helper methods
   */
  private buildUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${this.config.baseURL}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async applyRequestInterceptor(config: RequestConfig): Promise<RequestConfig> {
    if (this.config.interceptors.request) {
      return await this.config.interceptors.request(config);
    }
    return config;
  }

  private async applyResponseInterceptor(response: Response): Promise<Response> {
    if (this.config.interceptors.response) {
      return await this.config.interceptors.response(response);
    }
    return response;
  }

  private async applyErrorInterceptor(error: Error): Promise<Error> {
    if (this.config.interceptors.error) {
      return await this.config.interceptors.error(error);
    }
    return error;
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      return await response.json();
    }

    if (contentType?.includes('text/')) {
      return await response.text() as unknown as T;
    }

    if (contentType?.includes('application/octet-stream') || contentType?.includes('image/')) {
      return await response.blob() as unknown as T;
    }

    // Default to text
    return await response.text() as unknown as T;
  }

  private createApiError(error: Error, config: RequestConfig, duration: number): ApiError {
    let status: number | undefined;
    let response: Response | undefined;

    if ('status' in error) {
      status = (error as any).status;
    }

    if ('response' in error) {
      response = (error as any).response;
    }

    // Determine error code based on error type
    let code = 'API_ERROR';
    if (error.name === 'AbortError') {
      code = 'REQUEST_TIMEOUT';
    } else if (error.name === 'NetworkError' || error.message.includes('fetch')) {
      code = 'NETWORK_ERROR';
    } else if (status) {
      if (status === 401) code = 'AUTH_FAILED';
      else if (status === 403) code = 'PERMISSION_DENIED';
      else if (status === 404) code = 'NOT_FOUND';
      else if (status === 429) code = 'RATE_LIMITED';
      else if (status >= 500) code = 'SERVER_ERROR';
      else if (status >= 400) code = 'CLIENT_ERROR';
    }

    const apiError = new SkillSyncError(
      error.message,
      code,
      status && status >= 500 ? 'high' : 'medium',
      undefined,
      {
        component: 'ApiClient',
        action: 'api_request',
        metadata: {
          method: config.method,
          url: config.url,
          duration,
          status,
          ...config.metadata
        }
      },
      error
    ) as ApiError;

    apiError.status = status;
    apiError.response = response;
    apiError.config = config;

    return apiError;
  }
}

// Create default instance
export const apiClient = new ApiClient();

// Convenience functions
export const api = {
  get: <T = any>(url: string, config?: Partial<RequestConfig>) => apiClient.get<T>(url, config),
  post: <T = any>(url: string, data?: any, config?: Partial<RequestConfig>) => apiClient.post<T>(url, data, config),
  put: <T = any>(url: string, data?: any, config?: Partial<RequestConfig>) => apiClient.put<T>(url, data, config),
  patch: <T = any>(url: string, data?: any, config?: Partial<RequestConfig>) => apiClient.patch<T>(url, data, config),
  delete: <T = any>(url: string, config?: Partial<RequestConfig>) => apiClient.delete<T>(url, config),
  upload: <T = any>(url: string, file: File | FormData, config?: Partial<RequestConfig>) => apiClient.upload<T>(url, file, config)
};

export default apiClient;