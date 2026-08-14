import type { AxiosError } from 'axios';

interface ApiErrorResponseData {
  // Standard JSON error envelope
  message?: string;
  code?: string;
  details?: unknown;
  // ASP.NET Core ProblemDetails fields
  detail?: string;
  // ProblemDetails extensions — included when ConflictException carries codes
  errorCode?: string;
  conflictingEntityId?: string;
}

/**
 * Normalised API error thrown by the HTTP client for all non-2xx responses.
 * Use the boolean getters to branch on error type in use-cases and services.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
    public readonly conflictingEntityId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static fromAxiosError(error: AxiosError): ApiError {
    const data = error.response?.data as ApiErrorResponseData | undefined;
    const status = error.response?.status ?? 0;
    // ProblemDetails uses `detail`; legacy envelopes use `message`
    const message = data?.message ?? data?.detail ?? error.message ?? 'An unknown error occurred.';
    // ProblemDetails extensions use `errorCode`; legacy envelopes use `code`
    const code = data?.errorCode ?? data?.code;
    const details = data?.details;
    const conflictingEntityId = data?.conflictingEntityId;
    return new ApiError(status, message, code, details, conflictingEntityId);
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
  get isForbidden(): boolean {
    return this.status === 403;
  }
  get isNotFound(): boolean {
    return this.status === 404;
  }
  get isConflict(): boolean {
    return this.status === 409;
  }
  get isUnprocessable(): boolean {
    return this.status === 422;
  }
  get isServerError(): boolean {
    return this.status >= 500;
  }
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}
